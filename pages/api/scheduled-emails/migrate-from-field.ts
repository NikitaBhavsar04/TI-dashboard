// Migration endpoint to update all scheduled emails with from field
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify super admin authentication
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

    if (tokenPayload.role !== 'super_admin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    await dbConnect();

    const smtpUser = process.env.SMTP_USER || 'itsnikitabhavsar@gmail.com';
    
    console.log('[MIGRATION] Updating scheduled emails with from field:', smtpUser);

    // Update all scheduled emails that don't have a from field
    const result = await ScheduledEmail.updateMany(
      { $or: [{ from: { $exists: false } }, { from: null }, { from: '' }] },
      { $set: { from: smtpUser } }
    );

    console.log('[MIGRATION] Updated documents:', result.modifiedCount);

    return res.status(200).json({
      message: 'Migration completed successfully',
      smtpUser,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error: any) {
    console.error('[MIGRATION] Error:', error);
    return res.status(500).json({ 
      message: 'Migration failed', 
      error: error.message 
    });
  }
}
