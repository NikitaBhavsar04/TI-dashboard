// Real-time Email Tracking Events API
// File: pages/api/tracking/events.js

import dbConnect from '../../../lib/db';
import { verifyToken } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Verify authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { 
      limit = 50, 
      trackingId, 
      eventType,
      timeRange = '24h' 
    } = req.query;

    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Build query for recent events
    const query = {};
    
    // Time range filtering
    const now = new Date();
    let hoursBack = 24;
    
    switch (timeRange) {
      case '1h': hoursBack = 1; break;
      case '6h': hoursBack = 6; break;
      case '24h': hoursBack = 24; break;
      case '7d': hoursBack = 24 * 7; break;
    }
    
    const cutoffTime = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    
    // Get tracking records with recent events
    const pipeline = [
      {
        $match: {
          ...(trackingId && { trackingId }),
          'events.timestamp': { $gte: cutoffTime }
        }
      },
      {
        $unwind: '$events'
      },
      {
        $match: {
          'events.timestamp': { $gte: cutoffTime },
          ...(eventType && { 'events.type': eventType })
        }
      },
      {
        $sort: { 'events.timestamp': -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          trackingId: 1,
          recipientEmail: 1,
          emailId: 1,
          event: '$events',
          createdAt: 1
        }
      }
    ];

    const recentEvents = await trackingCollection.aggregate(pipeline).toArray();

    // Format events for frontend
    const formattedEvents = recentEvents.map(record => ({
      id: `${record.trackingId}_${record.event.timestamp.getTime()}`,
      trackingId: record.trackingId,
      recipientEmail: maskEmail(record.recipientEmail),
      emailId: record.emailId,
      eventType: record.event.type,
      timestamp: record.event.timestamp,
      location: record.event.location || null,
      device: record.event.device || null,
      ipAddress: maskIP(record.event.ipAddress),
      userAgent: record.event.userAgent || '',
      linkUrl: record.event.linkUrl || null,
      linkId: record.event.linkId || null,
      timeAgo: formatTimeAgo(record.event.timestamp)
    }));

    // Get summary stats for this time period
    const statsResult = await trackingCollection.aggregate([
      {
        $match: {
          'events.timestamp': { $gte: cutoffTime }
        }
      },
      {
        $unwind: '$events'
      },
      {
        $match: {
          'events.timestamp': { $gte: cutoffTime }
        }
      },
      {
        $group: {
          _id: '$events.type',
          count: { $sum: 1 },
          uniqueEmails: { $addToSet: '$recipientEmail' }
        }
      }
    ]).toArray();

    const summary = {
      totalEvents: recentEvents.length,
      opens: statsResult.find(s => s._id === 'open')?.count || 0,
      clicks: statsResult.find(s => s._id === 'click')?.count || 0,
      uniqueOpeners: statsResult.find(s => s._id === 'open')?.uniqueEmails.length || 0,
      uniqueClickers: statsResult.find(s => s._id === 'click')?.uniqueEmails.length || 0,
      timeRange: `${hoursBack}h`
    };

    res.status(200).json({
      success: true,
      events: formattedEvents,
      summary,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tracking events API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tracking events',
      details: error.message
    });
  }
}

/**
 * Mask email address for privacy
 */
function maskEmail(email) {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  const maskedUsername = username.length > 2 
    ? username[0] + '*'.repeat(username.length - 2) + username.slice(-1)
    : username;
  
  return `${maskedUsername}@${domain}`;
}

/**
 * Mask IP address for privacy
 */
function maskIP(ip) {
  if (!ip) return '';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip;
}

/**
 * Format timestamp as "time ago" string
 */
function formatTimeAgo(timestamp) {
  const now = new Date();
  const diff = now - new Date(timestamp);
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}
