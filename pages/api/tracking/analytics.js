// Email Tracking Analytics API
// File: pages/api/tracking/analytics.js

const EmailTrackingService = require('../../../lib/emailTrackingService');
const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  return mongoose.connection;
}
const { verifyToken } = require('../../../lib/auth');

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

    const connection = await connectDB();
    const trackingService = new EmailTrackingService(connection);

    if (req.method === 'GET') {
      return handleGetAnalytics(req, res, trackingService);
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Tracking analytics error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Handle GET request for tracking analytics
 */
async function handleGetAnalytics(req, res, trackingService) {
  try {
    const {
      trackingId,
      emailId,
      campaignId,
      recipientEmail,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0,
      groupBy = 'day' // day, week, month
    } = req.query;

    // Get basic analytics
    const analytics = await trackingService.getAnalytics({
      trackingId,
      emailId,
      campaignId,
      recipientEmail,
      dateFrom,
      dateTo,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get time-series data for charts
    const timeSeriesData = await getTimeSeriesData(trackingService, {
      trackingId,
      emailId,
      campaignId,
      recipientEmail,
      dateFrom,
      dateTo,
      groupBy
    });

    // Get top performing emails
    const topEmails = await getTopPerformingEmails(trackingService, {
      dateFrom,
      dateTo,
      limit: 10
    });

    // Get device/browser breakdown
    const deviceBreakdown = await getDeviceBreakdown(trackingService, {
      dateFrom,
      dateTo
    });

    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        timeSeriesData,
        topEmails,
        deviceBreakdown,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: analytics.trackingRecords.length
        }
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

/**
 * Get time series data for analytics charts
 */
async function getTimeSeriesData(trackingService, filters) {
  const { TrackingEvent } = require('../../../models/EmailTracking');
  
  // Build match conditions
  const matchConditions = {};
  
  if (filters.dateFrom || filters.dateTo) {
    matchConditions.timestamp = {};
    if (filters.dateFrom) matchConditions.timestamp.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) matchConditions.timestamp.$lte = new Date(filters.dateTo);
  }

  // Group by time period
  let dateGrouping;
  switch (filters.groupBy) {
    case 'hour':
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
      break;
    case 'week':
      dateGrouping = {
        year: { $year: '$timestamp' },
        week: { $week: '$timestamp' }
      };
      break;
    case 'month':
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
      break;
    default: // day
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
  }

  const timeSeriesData = await TrackingEvent.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: {
          ...dateGrouping,
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day',
          hour: '$_id.hour',
          week: '$_id.week'
        },
        opens: {
          $sum: {
            $cond: [{ $eq: ['$_id.eventType', 'open'] }, '$count', 0]
          }
        },
        clicks: {
          $sum: {
            $cond: [{ $eq: ['$_id.eventType', 'click'] }, '$count', 0]
          }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);

  return timeSeriesData;
}

/**
 * Get top performing emails
 */
async function getTopPerformingEmails(trackingService, filters) {
  const { EmailTracking } = require('../../../models/EmailTracking');
  
  const matchConditions = {};
  if (filters.dateFrom || filters.dateTo) {
    matchConditions.createdAt = {};
    if (filters.dateFrom) matchConditions.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) matchConditions.createdAt.$lte = new Date(filters.dateTo);
  }

  return await EmailTracking.aggregate([
    { $match: matchConditions },
    {
      $project: {
        subject: 1,
        recipientEmail: 1,
        'metrics.openCount': 1,
        'metrics.clickCount': 1,
        createdAt: 1,
        engagementScore: {
          $add: [
            { $multiply: ['$metrics.openCount', 1] },
            { $multiply: ['$metrics.clickCount', 3] }
          ]
        }
      }
    },
    { $sort: { engagementScore: -1 } },
    { $limit: filters.limit || 10 }
  ]);
}

/**
 * Get device and browser breakdown
 */
async function getDeviceBreakdown(trackingService, filters) {
  const { TrackingEvent } = require('../../../models/EmailTracking');
  
  const matchConditions = {};
  if (filters.dateFrom || filters.dateTo) {
    matchConditions.timestamp = {};
    if (filters.dateFrom) matchConditions.timestamp.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) matchConditions.timestamp.$lte = new Date(filters.dateTo);
  }

  const deviceData = await TrackingEvent.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: {
          deviceType: '$device.type',
          os: '$device.os',
          browser: '$device.browser'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        devices: {
          $push: {
            type: '$_id.deviceType',
            os: '$_id.os',
            browser: '$_id.browser',
            count: '$count'
          }
        },
        deviceTypes: {
          $addToSet: {
            type: '$_id.deviceType',
            count: '$count'
          }
        },
        browsers: {
          $addToSet: {
            browser: '$_id.browser',
            count: '$count'
          }
        },
        operatingSystems: {
          $addToSet: {
            os: '$_id.os',
            count: '$count'
          }
        }
      }
    }
  ]);

  return deviceData[0] || {
    devices: [],
    deviceTypes: [],
    browsers: [],
    operatingSystems: []
  };
}
