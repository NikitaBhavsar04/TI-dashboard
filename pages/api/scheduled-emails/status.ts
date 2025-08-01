import type { NextApiRequest, NextApiResponse } from 'next';
import ScheduledEmail from '@/models/ScheduledEmail';
import dbConnect from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const now = new Date();
    
    // Find emails that are due to be sent
    const dueEmails = await ScheduledEmail.find({
      status: 'pending',
      scheduledDate: { $lte: now },
      retryCount: { $lt: 3 }
    }).populate('advisoryId');

    const stats = {
      total: await ScheduledEmail.countDocuments(),
      pending: await ScheduledEmail.countDocuments({ status: 'pending' }),
      sent: await ScheduledEmail.countDocuments({ status: 'sent' }),
      failed: await ScheduledEmail.countDocuments({ status: 'failed' }),
      due: dueEmails.length
    };

    res.status(200).json({
      stats,
      dueEmails: dueEmails.map(email => ({
        _id: email._id,
        scheduledDate: email.scheduledDate,
        subject: email.subject,
        to: email.to
      }))
    });

  } catch (error) {
    console.error('Error checking scheduled emails:', error);
    res.status(500).json({ 
      message: 'Failed to check scheduled emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
