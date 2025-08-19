import { connectToDatabase } from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trackingId, url } = req.query;

  if (!trackingId || !url) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const db = await connectToDatabase();
    const trackingCollection = db.collection('emailTracking');

    // Find the tracking record
    const trackingRecord = await trackingCollection.findOne({ trackingId });

    if (trackingRecord) {
      // Update click count and add event
      const now = new Date();
      await trackingCollection.updateOne(
        { trackingId },
        {
          $inc: { clickCount: 1 },
          $push: {
            events: {
              type: 'click',
              timestamp: now,
              url: decodeURIComponent(url),
              userAgent: req.headers['user-agent'] || 'Unknown',
              ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'
            }
          },
          $set: { lastClickAt: now }
        }
      );
    }

    // Redirect to the original URL
    const decodedUrl = decodeURIComponent(url);
    res.redirect(302, decodedUrl);

  } catch (error) {
    console.error('Click tracking error:', error);
    
    // Still redirect to the URL even if tracking fails
    try {
      const decodedUrl = decodeURIComponent(url);
      res.redirect(302, decodedUrl);
    } catch (decodeError) {
      res.status(400).json({ error: 'Invalid URL parameter' });
    }
  }
}
