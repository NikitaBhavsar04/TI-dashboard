const mongoose = require('mongoose');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trackingId } = req.query;

  if (!trackingId) {
    // Return a transparent 1x1 pixel
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).end();
  }

  try {
    // Connect to MongoDB using the same pattern as send-advisory.js
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    
    const db = mongoose.connection.db;
    const trackingCollection = db.collection('emailTracking');

    // Find the tracking record
    const trackingRecord = await trackingCollection.findOne({ trackingId });

    if (trackingRecord) {
      // Update open count and add event
      const now = new Date();
      await trackingCollection.updateOne(
        { trackingId },
        {
          $inc: { openCount: 1 },
          $push: {
            events: {
              type: 'open',
              timestamp: now,
              userAgent: req.headers['user-agent'] || 'Unknown',
              ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'
            }
          },
          $set: { lastOpenAt: now }
        }
      );
      console.log(`📧 Email opened: ${trackingRecord.recipientEmail} (Tracking ID: ${trackingId})`);
    }

    // Return a transparent 1x1 pixel PNG
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).end(pixel);

  } catch (error) {
    console.error('Tracking pixel error:', error);
    
    // Still return a pixel even if tracking fails
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).end(pixel);
  }
}
