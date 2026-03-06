/**
 * /api/cron/process-emails
 *
 * Polls MongoDB for ScheduledEmail documents that are due and sends them.
 * Called every minute by:
 *   - Vercel Cron (configured in vercel.json)
 *   - cron-scheduler.js (for Docker / PM2 deployments)
 *
 * Uses sendScheduledEmailById — the exact same code path as the "Send Now" button.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Auth: Vercel Cron sends x-vercel-cron header, external callers send Bearer token
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const authHeader = req.headers['authorization'] as string | undefined;
  const cronSecret = process.env.CRON_SECRET;

  if (!isVercelCron) {
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  try {
    await dbConnect();

    const now = new Date();

    // Find all pending emails whose scheduled time has arrived.
    // sendScheduledEmailById has an internal atomic mutex (pending→processing)
    // so even if Agenda and cron both fire, only one will actually send.
    const pendingEmails = await ScheduledEmail.find({
      status: 'pending',
      scheduledDate: { $lte: now },
    }).lean();

    console.log(`[CRON] Found ${pendingEmails.length} pending email(s) to process at ${now.toISOString()}`);

    if (pendingEmails.length === 0) {
      return res.status(200).json({ success: true, processed: 0, results: [] });
    }

    const results: any[] = [];

    for (const emailDoc of pendingEmails) {
      const emailId = (emailDoc as any)._id.toString();

      // Atomically claim the email by stamping a lockedAt timestamp.
      // If another worker already stamped it within the last 5 minutes, skip.
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const claimed = await ScheduledEmail.findOneAndUpdate(
        {
          _id: (emailDoc as any)._id,
          status: 'pending',
          $or: [{ lockedAt: { $exists: false } }, { lockedAt: { $lt: fiveMinutesAgo } }],
        },
        { $set: { lockedAt: new Date() } },
        { new: false }
      );
      if (!claimed) {
        console.log(`[CRON] Email ${emailId} already claimed by another worker, skipping`);
        continue;
      }

      try {
        // Use the exact same function as the "Send Now" button — proven to work.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { sendScheduledEmailById } = require('../../../lib/sendScheduledEmailById');
        await sendScheduledEmailById(emailId, ScheduledEmail);
        results.push({ emailId, status: 'sent' });
        console.log(`[CRON] ✅ Email ${emailId} sent`);

      } catch (err: any) {
        console.error(`[CRON] ❌ Failed to send email ${emailId}:`, err.message);
        await ScheduledEmail.findByIdAndUpdate((emailDoc as any)._id, {
          status: 'failed',
          errorMessage: err.message,
          sentAt: new Date(),
          $inc: { retryCount: 1 },
        });
        results.push({ emailId, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      processed: results.length,
      sent: results.filter((r) => r.status === 'sent').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    });

  } catch (error: any) {
    console.error('[CRON] Fatal error in process-emails:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
