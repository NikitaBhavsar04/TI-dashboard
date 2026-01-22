/**
 * API Endpoint: Cancel Scheduled Email
 * 
 * Cancel a scheduled email in Google Apps Script
 */

import dbConnect from '../../../lib/mongodb';
import EmailTracking from '../../../models/EmailTracking';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { emailId, trackingId } = req.body;

    if (!emailId && !trackingId) {
      return res.status(400).json({
        error: 'Either emailId or trackingId is required'
      });
    }

    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      return res.status(500).json({
        error: 'APPS_SCRIPT_URL not configured'
      });
    }

    let appsScriptEmailId = emailId;

    // If trackingId provided, fetch the appsScriptEmailId
    if (!appsScriptEmailId && trackingId) {
      const tracking = await EmailTracking.findOne({ trackingId });
      if (tracking && tracking.appsScriptEmailId) {
        appsScriptEmailId = tracking.appsScriptEmailId;
      } else {
        return res.status(404).json({
          error: 'Email ID not found for tracking ID'
        });
      }
    }

    console.log('🚫 Cancelling scheduled email:', appsScriptEmailId);

    // Send cancellation request to Apps Script
    const payload = {
      action: 'cancel',
      emailId: appsScriptEmailId
    };

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
      throw new Error(result.data?.error || 'Failed to cancel email');
    }

    console.log('Email cancelled successfully');

    // Update tracking record
    if (trackingId) {
      await EmailTracking.findOneAndUpdate(
        { trackingId },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: new Date(),
            lastUpdated: new Date()
          }
        }
      );
    }

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
