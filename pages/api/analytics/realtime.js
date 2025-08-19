import { connectToDatabase } from '@/lib/db';
import jwt from 'jsonwebtoken';

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

    const db = await connectToDatabase();
    const trackingCollection = db.collection('emailTracking');

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentActivity = await trackingCollection.find({
      $or: [
        { 'events.timestamp': { $gte: oneDayAgo } },
        { createdAt: { $gte: oneDayAgo } }
      ]
    }).toArray();

    // Calculate real-time stats
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgoTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = {
      lastHour: {
        opens: 0,
        clicks: 0,
        emails: 0
      },
      last24Hours: {
        opens: 0,
        clicks: 0,
        emails: 0
      },
      totalToday: {
        opens: 0,
        clicks: 0
      }
    };

    recentActivity.forEach(record => {
      // Count emails sent in last 24 hours
      if (new Date(record.createdAt) >= oneDayAgoTime) {
        stats.last24Hours.emails++;
        
        // Count emails sent in last hour
        if (new Date(record.createdAt) >= oneHourAgo) {
          stats.lastHour.emails++;
        }
      }

      // Count events
      if (record.events) {
        record.events.forEach(event => {
          const eventTime = new Date(event.timestamp);
          
          if (eventTime >= oneDayAgoTime) {
            if (event.type === 'open') {
              stats.last24Hours.opens++;
              stats.totalToday.opens++;
              
              if (eventTime >= oneHourAgo) {
                stats.lastHour.opens++;
              }
            } else if (event.type === 'click') {
              stats.last24Hours.clicks++;
              stats.totalToday.clicks++;
              
              if (eventTime >= oneHourAgo) {
                stats.lastHour.clicks++;
              }
            }
          }
        });
      }
    });

    // Get latest events for activity feed
    const allEvents = [];
    recentActivity.forEach(record => {
      if (record.events) {
        record.events.forEach(event => {
          allEvents.push({
            ...event,
            email: record.email,
            advisoryId: record.advisoryId
          });
        });
      }
    });

    // Sort by timestamp and get latest 10
    const latestEvents = allEvents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.status(200).json({
      stats,
      latestEvents,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Real-time analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch real-time data' });
  }
}
