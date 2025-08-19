const mongoose = require('mongoose');

// Email tracking schema (we'll create this collection dynamically)
const EmailTracking = {
  emailId: String,
  recipientEmail: String,
  trackingId: String,
  events: [{
    type: String, // 'open', 'click', 'bounce'
    timestamp: Date,
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      region: String
    },
    device: {
      type: String, // 'desktop', 'mobile', 'tablet'
      os: String,
      browser: String
    },
    linkUrl: String // for click events
  }],
  openCount: { type: Number, default: 0 },
  lastOpened: Date,
  createdAt: { type: Date, default: Date.now }
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Handle tracking pixel request
    const { t: trackingId, type = 'open' } = req.query;
    
    if (!trackingId) {
      // Return a transparent 1x1 pixel even without tracking ID
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.status(200).end(pixel);
    }

    try {
      // Connect to MongoDB using the working pattern
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
      }
      
      const db = mongoose.connection.db;
      const trackingCollection = db.collection('emailTracking');

      // Get client IP and user agent
      const ipAddress = req.headers['x-forwarded-for'] || 
                       req.headers['x-real-ip'] || 
                       req.connection.remoteAddress || 
                       '127.0.0.1';
      
      const userAgent = req.headers['user-agent'] || '';

      // Parse device and browser info from user agent
      const deviceInfo = parseUserAgent(userAgent);

      // Update tracking record
      const trackingEvent = {
        type,
        timestamp: new Date(),
        ipAddress: ipAddress.split(',')[0].trim(), // Take first IP if multiple
        userAgent,
        device: deviceInfo
      };

      const updateResult = await trackingCollection.updateOne(
        { trackingId },
        {
          $push: { events: trackingEvent },
          $inc: { openCount: type === 'open' ? 1 : 0 },
          $set: { lastOpened: type === 'open' ? new Date() : undefined }
        },
        { upsert: false }
      );

      console.log(`📧 Email ${type} tracked: ${trackingId} (Modified: ${updateResult.modifiedCount})`);

      // Return 1x1 transparent pixel for email opens
      if (type === 'open') {
        const pixel = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        );
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', pixel.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        return res.status(200).send(pixel);
      }

      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('Tracking error:', error);
      
      // Still return pixel for opens even if tracking fails
      if (type === 'open') {
        const pixel = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        return res.status(200).send(pixel);
      }
      
      return res.status(500).json({ error: 'Tracking failed' });
    }
  }

  if (req.method === 'POST') {
    // Handle analytics request - get tracking data
    try {
      // Verify authentication
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies.token;
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userRole = decoded.role;

      // Only super_admin can access analytics
      if (userRole !== 'super_admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await dbConnect();
      const db = mongoose.connection.db;
      const trackingCollection = db.collection('emailTracking');

      const { emailId, startDate, endDate } = req.body;

      let filter = {};
      if (emailId) filter.emailId = emailId;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const trackingData = await trackingCollection.find(filter).toArray();

      // Calculate analytics
      const analytics = calculateAnalytics(trackingData);

      return res.status(200).json({
        success: true,
        data: trackingData,
        analytics
      });

    } catch (error) {
      console.error('Analytics error:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function parseUserAgent(userAgent) {
  const device = {
    type: 'desktop',
    os: 'Unknown',
    browser: 'Unknown'
  };

  // Detect device type
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    device.type = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
  }

  // Detect OS
  if (/Windows/.test(userAgent)) device.os = 'Windows';
  else if (/Mac OS/.test(userAgent)) device.os = 'macOS';
  else if (/Linux/.test(userAgent)) device.os = 'Linux';
  else if (/Android/.test(userAgent)) device.os = 'Android';
  else if (/iOS/.test(userAgent)) device.os = 'iOS';

  // Detect browser
  if (/Chrome/.test(userAgent)) device.browser = 'Chrome';
  else if (/Firefox/.test(userAgent)) device.browser = 'Firefox';
  else if (/Safari/.test(userAgent)) device.browser = 'Safari';
  else if (/Edge/.test(userAgent)) device.browser = 'Edge';
  else if (/Opera/.test(userAgent)) device.browser = 'Opera';

  return device;
}

function calculateAnalytics(trackingData) {
  const totalEmails = trackingData.length;
  const openedEmails = trackingData.filter(t => t.openCount > 0).length;
  const totalOpens = trackingData.reduce((sum, t) => sum + (t.openCount || 0), 0);
  const totalClicks = trackingData.reduce((sum, t) => 
    sum + (t.events?.filter(e => e.type === 'click').length || 0), 0);

  const deviceStats = {};
  const browserStats = {};
  const osStats = {};

  trackingData.forEach(tracking => {
    tracking.events?.forEach(event => {
      if (event.device) {
        deviceStats[event.device.type] = (deviceStats[event.device.type] || 0) + 1;
        browserStats[event.device.browser] = (browserStats[event.device.browser] || 0) + 1;
        osStats[event.device.os] = (osStats[event.device.os] || 0) + 1;
      }
    });
  });

  return {
    summary: {
      totalEmails,
      openedEmails,
      openRate: totalEmails > 0 ? (openedEmails / totalEmails * 100).toFixed(2) : 0,
      totalOpens,
      totalClicks,
      clickRate: openedEmails > 0 ? (totalClicks / openedEmails * 100).toFixed(2) : 0
    },
    deviceStats,
    browserStats,
    osStats,
    recentActivity: trackingData
      .flatMap(t => t.events?.map(e => ({ ...e, recipientEmail: t.recipientEmail })) || [])
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50)
  };
}
