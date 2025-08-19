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

    const { trackingId } = req.query;

    if (!trackingId) {
      return res.status(400).json({ error: 'Tracking ID is required' });
    }

    const db = await connectToDatabase();
    const trackingCollection = db.collection('emailTracking');

    // Get detailed tracking information
    const trackingRecord = await trackingCollection.findOne({ trackingId });

    if (!trackingRecord) {
      return res.status(404).json({ error: 'Tracking record not found' });
    }

    // Format the response
    const response = {
      trackingId: trackingRecord.trackingId,
      email: trackingRecord.email,
      advisoryId: trackingRecord.advisoryId,
      openCount: trackingRecord.openCount || 0,
      clickCount: trackingRecord.clickCount || 0,
      createdAt: trackingRecord.createdAt,
      lastOpenAt: trackingRecord.lastOpenAt,
      lastClickAt: trackingRecord.lastClickAt,
      events: trackingRecord.events || [],
      trackingOptions: trackingRecord.trackingOptions
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Tracking details error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking details' });
  }
}
