// pages/api/emails/check-sent.js
import dbConnect from '../../../lib/db';
import ScheduledEmail from '../../../models/ScheduledEmail';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Verify admin access
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { advisoryId, subject } = req.query;

    if (!advisoryId || !subject) {
      return res.status(400).json({ message: 'Advisory ID and subject are required' });
    }

    // Check if there's already a sent email for this advisory with similar subject
    const existingSentEmail = await ScheduledEmail.findOne({
      advisoryId,
      subject: { $regex: subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      status: 'sent'
    }).sort({ sentAt: -1 }); // Get the most recent one

    if (existingSentEmail) {
      // Count total recipients from all sent emails for this advisory
      const allSentEmails = await ScheduledEmail.find({
        advisoryId,
        status: 'sent'
      });

      const totalRecipients = allSentEmails.reduce((count, email) => {
        return count + (email.to ? email.to.length : 0);
      }, 0);

      return res.status(200).json({
        alreadySent: true,
        lastSentDate: existingSentEmail.sentAt,
        recipientCount: totalRecipients,
        lastSubject: existingSentEmail.subject
      });
    }

    return res.status(200).json({
      alreadySent: false
    });

  } catch (error) {
    console.error('Check sent email error:', error);
    res.status(500).json({ message: 'Failed to check email status' });
  }
}
