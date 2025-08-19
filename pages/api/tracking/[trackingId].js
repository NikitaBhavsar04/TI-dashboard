// Individual Email Tracking Details API
// File: pages/api/tracking/[trackingId].js

const EmailTrackingService = require('../../../lib/emailTrackingService');
const mongoose = require('mongoose');
const { verifyToken } = require('../../../lib/auth');

async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  return mongoose.connection;
}

export default async function handler(req, res) {
  try {
    // Verify admin access
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { trackingId } = req.query;
    
    if (!trackingId) {
      return res.status(400).json({ message: 'Tracking ID is required' });
    }

    const connection = await connectDB();
    const trackingService = new EmailTrackingService(connection);

    if (req.method === 'GET') {
      return handleGetTrackingDetails(req, res, trackingService, trackingId);
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Tracking details error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get detailed tracking information for a specific email
 */
async function handleGetTrackingDetails(req, res, trackingService, trackingId) {
  try {
    const { EmailTracking } = require('../../../models/EmailTracking');
    
    // Get the main tracking record
    const trackingRecord = await EmailTracking.findOne({ trackingId }).lean();
    
    if (!trackingRecord) {
      return res.status(404).json({ message: 'Tracking record not found' });
    }

    // Get all events for this tracking ID
    const events = await trackingService.getTrackingEvents(trackingId);

    // Process events to create timeline
    const timeline = events.map(event => ({
      id: event._id,
      type: event.eventType,
      timestamp: event.timestamp,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      device: event.device,
      location: event.location,
      linkUrl: event.linkUrl,
      linkId: event.linkId
    }));

    // Calculate additional metrics
    const firstOpen = events.find(e => e.eventType === 'open');
    const firstClick = events.find(e => e.eventType === 'click');
    const lastActivity = events[0]; // Events are sorted by timestamp DESC

    const uniqueIPs = [...new Set(events.map(e => e.ipAddress))];
    const uniqueUserAgents = [...new Set(events.map(e => e.userAgent))];

    // Group events by type for analysis
    const openEvents = events.filter(e => e.eventType === 'open');
    const clickEvents = events.filter(e => e.eventType === 'click');

    // Calculate engagement metrics
    const timeToFirstOpen = firstOpen && trackingRecord.createdAt ? 
      new Date(firstOpen.timestamp) - new Date(trackingRecord.createdAt) : null;
    
    const timeToFirstClick = firstClick && trackingRecord.createdAt ?
      new Date(firstClick.timestamp) - new Date(trackingRecord.createdAt) : null;

    // Device/browser breakdown for this specific email
    const deviceBreakdown = events.reduce((acc, event) => {
      if (!event.device) return acc;
      
      const key = `${event.device.type}_${event.device.browser}`;
      if (!acc[key]) {
        acc[key] = {
          type: event.device.type,
          browser: event.device.browser,
          os: event.device.os,
          count: 0
        };
      }
      acc[key].count++;
      return acc;
    }, {});

    // Click analysis
    const clickAnalysis = clickEvents.reduce((acc, event) => {
      if (!event.linkUrl) return acc;
      
      if (!acc[event.linkUrl]) {
        acc[event.linkUrl] = {
          url: event.linkUrl,
          linkId: event.linkId,
          clicks: 0,
          firstClickAt: event.timestamp,
          lastClickAt: event.timestamp
        };
      }
      
      acc[event.linkUrl].clicks++;
      if (new Date(event.timestamp) > new Date(acc[event.linkUrl].lastClickAt)) {
        acc[event.linkUrl].lastClickAt = event.timestamp;
      }
      
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        tracking: trackingRecord,
        timeline,
        summary: {
          totalEvents: events.length,
          totalOpens: openEvents.length,
          totalClicks: clickEvents.length,
          uniqueIPs: uniqueIPs.length,
          uniqueDevices: uniqueUserAgents.length,
          firstOpenAt: firstOpen?.timestamp || null,
          firstClickAt: firstClick?.timestamp || null,
          lastActivityAt: lastActivity?.timestamp || null,
          timeToFirstOpen: timeToFirstOpen ? formatDuration(timeToFirstOpen) : null,
          timeToFirstClick: timeToFirstClick ? formatDuration(timeToFirstClick) : null,
          isActive: trackingRecord.status === 'active'
        },
        devices: Object.values(deviceBreakdown),
        clickedLinks: Object.values(clickAnalysis).sort((a, b) => b.clicks - a.clicks),
        activityHeatmap: generateActivityHeatmap(events)
      }
    });

  } catch (error) {
    console.error('Get tracking details error:', error);
    return res.status(500).json({ message: 'Failed to fetch tracking details' });
  }
}

/**
 * Format duration in milliseconds to human readable format
 */
function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Generate activity heatmap data (24-hour format)
 */
function generateActivityHeatmap(events) {
  const heatmap = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    opens: 0,
    clicks: 0
  }));

  events.forEach(event => {
    const hour = new Date(event.timestamp).getHours();
    if (event.eventType === 'open') {
      heatmap[hour].opens++;
    } else if (event.eventType === 'click') {
      heatmap[hour].clicks++;
    }
  });

  return heatmap;
}
