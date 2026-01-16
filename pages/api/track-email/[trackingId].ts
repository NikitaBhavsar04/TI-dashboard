import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { trackingId } = req.query;

    console.log('🔍 [TRACKING] Pixel loaded - Tracking ID:', trackingId);

    if (!trackingId) {
      console.log('⚠️ [TRACKING] No tracking ID provided');
      return sendTrackingPixel(res);
    }

    // Find the scheduled email by tracking ID
    const scheduledEmail = await ScheduledEmail.findOne({ trackingId });

    if (!scheduledEmail) {
      console.log('⚠️ [TRACKING] Email not found for tracking ID:', trackingId);
      // Still return the pixel even if not found (don't leak info to users)
      return sendTrackingPixel(res);
    }

    console.log('📧 [TRACKING] Email found:', {
      id: scheduledEmail._id,
      to: scheduledEmail.to,
      subject: scheduledEmail.subject,
      currentStatus: scheduledEmail.isOpened ? 'Already opened' : 'First open'
    });

    // Extract tracking metadata
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
                      (req.headers['x-real-ip'] as string) ||
                      req.socket.remoteAddress ||
                      'unknown';
    
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Update email tracking
    const now = new Date();
    
    // Initialize opens array if it doesn't exist
    if (!scheduledEmail.opens) {
      scheduledEmail.opens = [];
    }
    
    // Add to opens array
    scheduledEmail.opens.push({
      timestamp: now,
      ipAddress,
      userAgent
    }); 

    // Set first open timestamp
    if (!scheduledEmail.isOpened) {
      scheduledEmail.isOpened = true;
      scheduledEmail.openedAt = now;
      console.log(`✅ [TRACKING] FIRST OPEN recorded for email ${scheduledEmail._id}`);
    } else {
      console.log(`📊 [TRACKING] Additional open recorded (total: ${scheduledEmail.opens.length})`);
    }

    await scheduledEmail.save();

    console.log(`✅ [TRACKING] Email tracking saved successfully - ID: ${trackingId}, Total opens: ${scheduledEmail.opens.length}`);

    // Return 1x1 transparent pixel
    return sendTrackingPixel(res);

  } catch (error) {
    console.error('❌ [TRACKING] Email tracking error:', error);
    // Still return the pixel even on error (don't break email display)
    return sendTrackingPixel(res);
  }
}

function sendTrackingPixel(res: NextApiResponse) {
  // 1x1 transparent GIF pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', pixel.length.toString());
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  return res.status(200).send(pixel);
}
