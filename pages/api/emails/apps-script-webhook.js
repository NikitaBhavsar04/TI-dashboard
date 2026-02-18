// Webhook endpoint for Google Apps Script to notify when emails are sent
import { connectDB } from '../../../lib/db';
import ScheduledEmail from '../../../models/ScheduledEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emailId, status, trackingId, advisoryId, clientId, timestamp, errorMessage } = req.body;

    console.log(`📥 Apps Script webhook received:`, {
      emailId,
      status,
      trackingId,
      timestamp
    });

    if (!emailId || !status) {
      return res.status(400).json({ error: 'emailId and status are required' });
    }

    await connectDB();

    // Find the email record by MongoDB _id
    const emailDoc = await ScheduledEmail.findById(emailId);

    if (!emailDoc) {
      console.error(`❌ Email not found: ${emailId}`);
      return res.status(404).json({ error: 'Email not found' });
    }

    // Update status based on Apps Script notification
    emailDoc.status = status; // 'sent', 'failed', etc.
    emailDoc.sentAt = new Date(timestamp || Date.now());
    
    if (errorMessage) {
      emailDoc.errorMessage = errorMessage;
    }

    await emailDoc.save();

    console.log(`✅ Email status updated via webhook: ${emailId} -> ${status}`);

    return res.status(200).json({
      success: true,
      message: 'Status updated successfully',
      emailId,
      status
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
