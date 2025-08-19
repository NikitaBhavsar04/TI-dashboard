const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from cookies
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super admin required.' });
    }

    // Connect to MongoDB using the same pattern as check-tracking.js
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Get all tracking data
    const trackingData = await trackingCollection.find({}).toArray();

    // Calculate analytics metrics
    const totalEmails = trackingData.length;
    const totalOpens = trackingData.reduce((sum, record) => sum + (record.openCount || 0), 0);
    const uniqueOpens = trackingData.filter(record => (record.openCount || 0) > 0).length;
    const totalClicks = trackingData.reduce((sum, record) => sum + (record.clickCount || 0), 0);
    const uniqueClicks = trackingData.filter(record => (record.clickCount || 0) > 0).length;

    // Calculate rates
    const openRate = totalEmails > 0 ? ((uniqueOpens / totalEmails) * 100).toFixed(1) : '0.0';
    const clickRate = totalEmails > 0 ? ((uniqueClicks / totalEmails) * 100).toFixed(1) : '0.0';
    const clickToOpenRate = uniqueOpens > 0 ? ((uniqueClicks / uniqueOpens) * 100).toFixed(1) : '0.0';

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = trackingData.filter(record => 
      new Date(record.createdAt) >= sevenDaysAgo
    );

    // Group by date for chart data
    const activityByDate = {};
    recentActivity.forEach(record => {
      const date = new Date(record.createdAt).toLocaleDateString();
      if (!activityByDate[date]) {
        activityByDate[date] = { date, emails: 0, opens: 0, clicks: 0 };
      }
      activityByDate[date].emails += 1;
      activityByDate[date].opens += record.openCount || 0;
      activityByDate[date].clicks += record.clickCount || 0;
    });

    const chartData = Object.values(activityByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Get top performing emails
    const topEmails = trackingData
      .filter(record => record.advisoryId)
      .sort((a, b) => (b.openCount || 0) - (a.openCount || 0))
      .slice(0, 5)
      .map(record => ({
        advisoryId: record.advisoryId,
        email: record.email,
        opens: record.openCount || 0,
        clicks: record.clickCount || 0,
        createdAt: record.createdAt
      }));

    res.status(200).json({
      overview: {
        totalEmails,
        totalOpens,
        uniqueOpens,
        totalClicks,
        uniqueClicks,
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        clickToOpenRate: parseFloat(clickToOpenRate)
      },
      chartData,
      topEmails,
      recentActivity: recentActivity.length
    });

  } catch (error) {
    console.error('Analytics data error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
}
