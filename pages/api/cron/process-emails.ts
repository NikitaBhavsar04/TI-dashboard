// API to process pending emails (can be called by external cron service)
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import { sendEmailNotification } from '@/lib/emailSender';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request (add your secret key for security)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await dbConnect();

    // Find pending emails that should be sent
    const pendingEmails = await ScheduledEmail.find({
      status: 'pending',
      scheduleTime: { $lte: new Date() }
    }).populate('advisoryId');

    const results = [];

    for (const scheduledEmail of pendingEmails) {
      try {
        await sendEmailNotification(
          scheduledEmail.advisoryId._id,
          scheduledEmail.recipients
        );

        scheduledEmail.status = 'sent';
        scheduledEmail.sentAt = new Date();
        await scheduledEmail.save();

        results.push({
          emailId: scheduledEmail._id,
          status: 'sent',
          recipients: scheduledEmail.recipients.length
        });

      } catch (error) {
        console.error(`Failed to send email ${scheduledEmail._id}:`, error);
        
        scheduledEmail.status = 'failed';
        scheduledEmail.error = error.message;
        scheduledEmail.retryCount = (scheduledEmail.retryCount || 0) + 1;
        await scheduledEmail.save();

        results.push({
          emailId: scheduledEmail._id,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Process emails error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process emails'
    });
  }
}
