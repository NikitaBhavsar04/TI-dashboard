/**
 * API Endpoint: Check Scheduled Email Status
 *
 * Returns the current status of a scheduled email from MongoDB.
 */

import dbConnect from '../../../lib/db';
import ScheduledEmail from '../../../models/ScheduledEmail';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await dbConnect();

    const { emailId } = req.query;
    if (!emailId) {
      return res.status(400).json({ error: 'emailId is required' });
    }

    const emailDoc = await ScheduledEmail.findById(emailId).lean();
    if (!emailDoc) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.status(200).json({
      success: true,
      email: {
        id: emailDoc._id,
        to: emailDoc.to,
        subject: emailDoc.subject,
        status: emailDoc.status,
        scheduledDate: emailDoc.scheduledDate,
        sentAt: emailDoc.sentAt,
        errorMessage: emailDoc.errorMessage,
        schedulingMethod: emailDoc.schedulingMethod
      }
    });

  } catch (error) {
    console.error('❌ Error checking email status:', error);
    return res.status(500).json({
      error: 'Failed to check email status',
      details: error.message
    });
  }
}
