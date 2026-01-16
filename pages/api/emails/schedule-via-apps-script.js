/**
 * API Endpoint: Schedule Email via Google Apps Script
 * 
 * This endpoint interfaces with Google Apps Script to schedule emails
 * that will be sent from Gmail even when your local server is offline
 */

import dbConnect from '../../../lib/mongodb';
import EmailTracking from '../../../models/EmailTracking';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const {
      to,
      subject,
      htmlBody,
      scheduledTime,
      replyTo,
      cc,
      bcc,
      trackingId,
      advisoryId,
      clientId,
      clientName
    } = req.body;

    // Validate required fields
    if (!to || !subject || !htmlBody || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, htmlBody, scheduledTime'
      });
    }

    // Validate Apps Script URL
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      return res.status(500).json({
        error: 'APPS_SCRIPT_URL not configured in environment variables'
      });
    }

    // Prepare payload for Apps Script
    const payload = {
      action: 'schedule',
      to,
      subject,
      htmlBody,
      scheduledTime,
      replyTo: replyTo || process.env.SMTP_USER,
      cc: cc || null,
      bcc: bcc || null,
      trackingId,
      advisoryId,
      clientId
    };

    console.log('📧 Scheduling email via Google Apps Script:', {
      to,
      scheduledTime,
      trackingId
    });

    // Send request to Google Apps Script
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned status ${response.status}`);
    }

    const result = await response.json();

    if (!result.data || !result.data.success) {
      throw new Error(result.data?.error || 'Failed to schedule email');
    }

    console.log('✅ Email scheduled successfully:', result.data.emailId);

    // Update or create tracking record if trackingId provided
    if (trackingId) {
      const trackingUpdate = {
        status: 'scheduled',
        scheduledFor: new Date(scheduledTime),
        scheduledVia: 'apps-script',
        appsScriptEmailId: result.data.emailId,
        scheduledAt: new Date(),
        lastUpdated: new Date()
      };

      const existingTracking = await EmailTracking.findOne({ trackingId });

      if (existingTracking) {
        await EmailTracking.findOneAndUpdate(
          { trackingId },
          { $set: trackingUpdate }
        );
      } else {
        await EmailTracking.create({
          trackingId,
          advisoryId,
          clientId,
          clientEmail: to,
          clientName: clientName || 'Unknown',
          subject,
          ...trackingUpdate
        });
      }

      console.log('📊 Tracking record updated:', trackingId);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Email scheduled successfully via Google Apps Script',
      data: {
        emailId: result.data.emailId,
        scheduledTime: result.data.scheduledTime,
        trackingId,
        method: 'apps-script'
      }
    });

  } catch (error) {
    console.error('❌ Error scheduling email:', error);
    return res.status(500).json({
      error: 'Failed to schedule email',
      details: error.message
    });
  }
}
