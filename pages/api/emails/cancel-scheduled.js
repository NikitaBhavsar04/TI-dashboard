/**
 * API Endpoint: Cancel Scheduled Email
 *
 * Cancels a pending scheduled email in Agenda.js and marks it cancelled in MongoDB.
 */

import dbConnect from '../../../lib/db';
import ScheduledEmail from '../../../models/ScheduledEmail';
import { verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { emailId } = req.body;
    if (!emailId) {
      return res.status(400).json({ error: 'emailId is required' });
    }

    const emailDoc = await ScheduledEmail.findById(emailId);
    if (!emailDoc) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (emailDoc.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot cancel email with status "${emailDoc.status}"`
      });
    }

    // Cancel in Agenda.js
    try {
      const { agenda } = require('../../../lib/agenda');
      await agenda.cancel({ 'data.emailId': emailId });
      console.log(`✅ Agenda job cancelled for email: ${emailId}`);
    } catch (agendaErr) {
      console.warn('⚠️ Agenda cancel warning:', agendaErr.message);
      // Continue — still mark as cancelled in DB
    }

    emailDoc.status = 'cancelled';
    emailDoc.cancelledAt = new Date();
    await emailDoc.save();

    console.log(`✅ Email ${emailId} marked as cancelled in MongoDB`);

    return res.status(200).json({
      success: true,
      message: 'Email cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Error cancelling email:', error);
    return res.status(500).json({
      error: 'Failed to cancel email',
      details: error.message
    });
  }
}

}
