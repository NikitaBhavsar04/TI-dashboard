// MongoDB Schema for Email Tracking System
// File: models/EmailTracking.js

const mongoose = require('mongoose');

// Main email tracking document schema
const emailTrackingSchema = new mongoose.Schema({
  // Unique tracking identifier for this email send
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Email metadata
  emailId: {
    type: String,
    required: true,
    index: true // Reference to your advisory/email record
  },
  
  recipientEmail: {
    type: String,
    required: true,
    index: true
  },
  
  // Sender information
  senderEmail: {
    type: String,
    required: true
  },
  
  // Email content metadata
  subject: String,
  campaignId: String, // Optional: for grouping related emails
  
  // Tracking configuration
  trackingConfig: {
    trackOpens: { type: Boolean, default: true },
    trackClicks: { type: Boolean, default: true },
    trackLocation: { type: Boolean, default: false },
    trackDevice: { type: Boolean, default: false }
  },
  
  // Aggregate counters for quick queries
  metrics: {
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    uniqueOpens: { type: Number, default: 0 },
    uniqueClicks: { type: Number, default: 0 },
    firstOpenAt: Date,
    lastOpenAt: Date,
    firstClickAt: Date,
    lastClickAt: Date
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'expired', 'disabled'],
    default: 'active'
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  }
});

// Individual tracking events schema
const trackingEventSchema = new mongoose.Schema({
  trackingId: {
    type: String,
    required: true,
    index: true
  },
  
  eventType: {
    type: String,
    required: true,
    enum: ['open', 'click'],
    index: true
  },
  
  // Event details
  timestamp: { type: Date, default: Date.now, index: true },
  
  // Request metadata
  ipAddress: String,
  userAgent: String,
  referer: String,
  
  // Click-specific data
  linkUrl: String, // Original URL for click events
  linkId: String,  // Internal link identifier
  
  // Geographic data (optional)
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  
  // Device information (parsed from user agent)
  device: {
    type: { type: String, enum: ['desktop', 'mobile', 'tablet'] }, // device type
    os: String,      // operating system
    browser: String, // browser name
    version: String  // browser version
  },
  
  // Deduplication hash (prevents duplicate events)
  eventHash: {
    type: String,
    index: true,
    sparse: true
  }
});

// Indexes for performance
emailTrackingSchema.index({ createdAt: -1 });
emailTrackingSchema.index({ recipientEmail: 1, createdAt: -1 });
emailTrackingSchema.index({ campaignId: 1, createdAt: -1 });
emailTrackingSchema.index({ 'metrics.openCount': -1 });

trackingEventSchema.index({ trackingId: 1, timestamp: -1 });
trackingEventSchema.index({ eventType: 1, timestamp: -1 });
trackingEventSchema.index({ eventHash: 1 }, { sparse: true });

// TTL index for automatic cleanup of expired tracking data
emailTrackingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
trackingEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = {
  EmailTracking: mongoose.model('EmailTracking', emailTrackingSchema),
  TrackingEvent: mongoose.model('TrackingEvent', trackingEventSchema)
};
