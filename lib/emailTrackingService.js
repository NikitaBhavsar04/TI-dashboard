// Lightweight Email Tracking Service
// File: lib/emailTrackingService.js

const { EmailTracking, TrackingEvent } = require('../models/EmailTracking');
const crypto = require('crypto');

class EmailTrackingService {
  constructor(mongoConnection) {
    this.db = mongoConnection;
  }

  /**
   * Generate a unique tracking ID for an email
   * @param {string} emailId - The email/advisory ID
   * @param {string} recipientEmail - Recipient's email address
   * @returns {string} Unique tracking ID
   */
  generateTrackingId(emailId, recipientEmail) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(`${emailId}:${recipientEmail}:${timestamp}:${randomBytes}`)
      .digest('hex')
      .substring(0, 16);
    
    return `et_${hash}_${timestamp.toString(36)}`;
  }

  /**
   * Initialize tracking for a new email
   * @param {Object} emailData - Email tracking configuration
   * @returns {Promise<Object>} Tracking record with generated ID
   */
  async initializeTracking(emailData) {
    const {
      emailId,
      recipientEmail,
      senderEmail,
      subject,
      campaignId,
      trackingConfig = {}
    } = emailData;

    const trackingId = this.generateTrackingId(emailId, recipientEmail);

    const trackingRecord = new EmailTracking({
      trackingId,
      emailId,
      recipientEmail,
      senderEmail,
      subject,
      campaignId,
      trackingConfig: {
        trackOpens: true,
        trackClicks: true,
        trackLocation: false,
        trackDevice: true,
        ...trackingConfig
      }
    });

    await trackingRecord.save();

    return {
      trackingId,
      pixelUrl: this.generatePixelUrl(trackingId),
      trackLinkFunction: (url, linkId) => this.generateTrackedLink(trackingId, url, linkId)
    };
  }

  /**
   * Generate tracking pixel URL (independent of base URL)
   * @param {string} trackingId - The tracking ID
   * @returns {string} Pixel URL
   */
  generatePixelUrl(trackingId) {
    // Use a simple GET parameter approach that works with any domain
    return `/api/track/pixel?t=${trackingId}&r=${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate tracked link URL
   * @param {string} trackingId - The tracking ID
   * @param {string} originalUrl - Original destination URL
   * @param {string} linkId - Optional link identifier
   * @returns {string} Tracked link URL
   */
  generateTrackedLink(trackingId, originalUrl, linkId = null) {
    const encodedUrl = encodeURIComponent(originalUrl);
    const linkParam = linkId ? `&l=${encodeURIComponent(linkId)}` : '';
    return `/api/track/link?t=${trackingId}&u=${encodedUrl}${linkParam}&r=${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Log a tracking event (open/click)
   * @param {Object} eventData - Event details
   * @returns {Promise<boolean>} Success status
   */
  async logEvent(eventData) {
    const {
      trackingId,
      eventType,
      ipAddress,
      userAgent,
      referer,
      linkUrl,
      linkId
    } = eventData;

    try {
      // Create event hash for deduplication (same user agent + IP + tracking ID + hour)
      const hour = new Date().setMinutes(0, 0, 0);
      const eventHash = crypto
        .createHash('md5')
        .update(`${trackingId}:${eventType}:${ipAddress}:${userAgent}:${hour}`)
        .digest('hex');

      // Check if this exact event already exists (deduplication)
      const existingEvent = await TrackingEvent.findOne({ eventHash });
      
      // Parse device information
      const deviceInfo = this.parseUserAgent(userAgent);
      
      // Create tracking event
      const trackingEvent = new TrackingEvent({
        trackingId,
        eventType,
        ipAddress,
        userAgent,
        referer,
        linkUrl,
        linkId,
        device: deviceInfo,
        eventHash: existingEvent ? undefined : eventHash // Only set hash if not duplicate
      });

      await trackingEvent.save();

      // Update aggregate metrics
      await this.updateMetrics(trackingId, eventType, !existingEvent);

      return true;
    } catch (error) {
      console.error('Failed to log tracking event:', error);
      return false;
    }
  }

  /**
   * Update aggregate metrics for a tracking record
   * @param {string} trackingId - The tracking ID
   * @param {string} eventType - Event type ('open' or 'click')
   * @param {boolean} isUnique - Whether this is a unique event
   */
  async updateMetrics(trackingId, eventType, isUnique) {
    const updateQuery = {};
    
    if (eventType === 'open') {
      updateQuery['$inc'] = { 'metrics.openCount': 1 };
      if (isUnique) {
        updateQuery['$inc']['metrics.uniqueOpens'] = 1;
      }
      updateQuery['$set'] = { 'metrics.lastOpenAt': new Date() };
      updateQuery['$setOnInsert'] = { 'metrics.firstOpenAt': new Date() };
    } else if (eventType === 'click') {
      updateQuery['$inc'] = { 'metrics.clickCount': 1 };
      if (isUnique) {
        updateQuery['$inc']['metrics.uniqueClicks'] = 1;
      }
      updateQuery['$set'] = { 'metrics.lastClickAt': new Date() };
      updateQuery['$setOnInsert'] = { 'metrics.firstClickAt': new Date() };
    }

    await EmailTracking.updateOne(
      { trackingId },
      updateQuery,
      { upsert: false }
    );
  }

  /**
   * Parse user agent string to extract device information
   * @param {string} userAgent - User agent string
   * @returns {Object} Device information
   */
  parseUserAgent(userAgent = '') {
    const ua = userAgent.toLowerCase();
    
    // Device type detection
    let deviceType = 'desktop';
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
      deviceType = 'tablet';
    }

    // OS detection
    let os = 'unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Browser detection
    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';

    return {
      type: deviceType,
      os,
      browser,
      version: this.extractVersion(userAgent, browser)
    };
  }

  /**
   * Extract browser version from user agent
   * @param {string} userAgent - User agent string
   * @param {string} browser - Browser name
   * @returns {string} Browser version
   */
  extractVersion(userAgent, browser) {
    const ua = userAgent.toLowerCase();
    let versionRegex;

    switch (browser) {
      case 'Chrome':
        versionRegex = /chrome\/([0-9.]+)/;
        break;
      case 'Firefox':
        versionRegex = /firefox\/([0-9.]+)/;
        break;
      case 'Safari':
        versionRegex = /version\/([0-9.]+)/;
        break;
      case 'Edge':
        versionRegex = /edge\/([0-9.]+)/;
        break;
      default:
        return 'unknown';
    }

    const match = ua.match(versionRegex);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get tracking analytics for reporting
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const {
      trackingId,
      emailId,
      campaignId,
      recipientEmail,
      dateFrom,
      dateTo,
      limit = 100,
      offset = 0
    } = filters;

    // Build query
    const query = {};
    if (trackingId) query.trackingId = trackingId;
    if (emailId) query.emailId = emailId;
    if (campaignId) query.campaignId = campaignId;
    if (recipientEmail) query.recipientEmail = recipientEmail;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Get tracking records with metrics
    const trackingRecords = await EmailTracking
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    // Get aggregate statistics
    const aggregateStats = await EmailTracking.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          totalOpens: { $sum: '$metrics.openCount' },
          totalClicks: { $sum: '$metrics.clickCount' },
          uniqueOpens: { $sum: '$metrics.uniqueOpens' },
          uniqueClicks: { $sum: '$metrics.uniqueClicks' },
          emailsOpened: {
            $sum: {
              $cond: [{ $gt: ['$metrics.openCount', 0] }, 1, 0]
            }
          },
          emailsClicked: {
            $sum: {
              $cond: [{ $gt: ['$metrics.clickCount', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const stats = aggregateStats[0] || {
      totalEmails: 0,
      totalOpens: 0,
      totalClicks: 0,
      uniqueOpens: 0,
      uniqueClicks: 0,
      emailsOpened: 0,
      emailsClicked: 0
    };

    return {
      trackingRecords,
      statistics: {
        ...stats,
        openRate: stats.totalEmails > 0 ? (stats.emailsOpened / stats.totalEmails * 100).toFixed(2) : 0,
        clickRate: stats.totalEmails > 0 ? (stats.emailsClicked / stats.totalEmails * 100).toFixed(2) : 0,
        clickThroughRate: stats.emailsOpened > 0 ? (stats.emailsClicked / stats.emailsOpened * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * Get detailed events for a specific tracking ID
   * @param {string} trackingId - The tracking ID
   * @returns {Promise<Array>} Array of tracking events
   */
  async getTrackingEvents(trackingId) {
    return await TrackingEvent
      .find({ trackingId })
      .sort({ timestamp: -1 })
      .lean();
  }

  /**
   * Clean up expired tracking data
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupExpiredData() {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    
    const expiredTracking = await EmailTracking.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    const expiredEvents = await TrackingEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    return {
      deletedTrackingRecords: expiredTracking.deletedCount,
      deletedEvents: expiredEvents.deletedCount
    };
  }
}

module.exports = EmailTrackingService;
