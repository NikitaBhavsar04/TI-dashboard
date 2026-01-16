/**
 * API Endpoint: Check Scheduled Email Status
 * 
 * Check the status of a scheduled email in Google Apps Script
 */

import dbConnect from '../../../lib/mongodb';
import EmailTracking from '../../../models/EmailTracking';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { emailId, trackingId } = req.query;

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

    // Send status check request to Apps Script
    const payload = {
      action: 'status',
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
      throw new Error(result.data?.error || 'Failed to check status');
    }

    // Also fetch local tracking data
    let localTracking = null;
    if (trackingId) {
      localTracking = await EmailTracking.findOne({ trackingId });
    }

    return res.status(200).json({
      success: true,
      appsScript: result.data.email,
      localTracking: localTracking
    });

  } catch (error) {
    console.error('❌ Error checking status:', error);
    return res.status(500).json({
      error: 'Failed to check email status',
      details: error.message
    });
  }
}
