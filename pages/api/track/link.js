// Link Tracking and Redirect Endpoint
// File: pages/api/track/link.js

const EmailTrackingService = require('../../../lib/emailTrackingService');
const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  return mongoose.connection;
}

/**
 * Validate URL for security
 */
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Allow http and https protocols only
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Block localhost and internal IPs for security
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract client IP address
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    // Extract parameters from query
    const { 
      t: trackingId, 
      u: encodedUrl, 
      l: linkId 
    } = req.query;
    
    // Decode the original URL
    const originalUrl = encodedUrl ? decodeURIComponent(encodedUrl) : null;
    
    if (!trackingId || !originalUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validate URL
    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // Connect to database
    const connection = await connectDB();
    const trackingService = new EmailTrackingService(connection);

    // Extract request metadata
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || req.headers.referrer || '';

    // Log the click event asynchronously (don't block redirect)
    setImmediate(async () => {
      try {
        await trackingService.logEvent({
          trackingId,
          eventType: 'click',
          ipAddress,
          userAgent,
          referer,
          linkUrl: originalUrl,
          linkId
        });
      } catch (error) {
        console.error('Failed to log click event:', error);
      }
    });

    // Redirect immediately to original URL
    res.redirect(302, originalUrl);

  } catch (error) {
    console.error('Link tracking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
