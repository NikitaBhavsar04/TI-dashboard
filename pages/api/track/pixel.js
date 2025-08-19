// Tracking Pixel Endpoint - Serves 1x1 transparent GIF
// File: pages/api/track/pixel.js

const EmailTrackingService = require('../../../lib/emailTrackingService');
const mongoose = require('mongoose');

// 1x1 transparent GIF in base64
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  return mongoose.connection;
}

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    // Extract tracking ID from query
    const { t: trackingId } = req.query;
    
    if (!trackingId) {
      return servePixel(res);
    }

    // Connect to database
    const connection = await connectDB();
    const trackingService = new EmailTrackingService(connection);

    // Extract request metadata
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || req.headers.referrer || '';

    // Log the open event asynchronously (don't block pixel serving)
    setImmediate(async () => {
      try {
        await trackingService.logEvent({
          trackingId,
          eventType: 'open',
          ipAddress,
          userAgent,
          referer
        });
      } catch (error) {
        console.error('Failed to log tracking event:', error);
      }
    });

    // Serve pixel immediately
    return servePixel(res);

  } catch (error) {
    console.error('Tracking pixel error:', error);
    return servePixel(res);
  }
}

/**
 * Serve the tracking pixel with appropriate headers
 */
function servePixel(res) {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', PIXEL_GIF.length);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(PIXEL_GIF);
}

/**
 * Extract client IP address from request
 */
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  const cloudflare = req.headers['cf-connecting-ip'];
  
  if (cloudflare) return cloudflare;
  if (real) return real;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         'unknown';
}
