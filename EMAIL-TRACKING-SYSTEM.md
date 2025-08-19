# Email Tracking System Documentation

## Overview

This comprehensive email tracking system provides pixel-based email tracking and link click tracking for the Threat Advisory platform. It's designed to work independently of localhost constraints and provides detailed analytics for email campaigns.

## System Architecture

```
Email Tracking System
├── Database Layer (MongoDB)
│   ├── EmailTracking Collection
│   └── TrackingEvent Collection
├── Service Layer
│   └── EmailTrackingService Class
├── API Endpoints
│   ├── /api/track/pixel - Tracking pixel
│   ├── /api/track/link - Link tracking
│   ├── /api/tracking/analytics - Analytics API
│   └── /api/tracking/[trackingId] - Individual tracking
├── Email Templates
│   └── Enhanced template generator with tracking
└── Integration Layer
    └── Enhanced email sending API
```

## Quick Start

### 1. Setup Database

```bash
# Run the setup script to initialize tracking collections
node scripts/setup-email-tracking.js
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.tracking.template .env.local

# Update .env.local with your configuration:
MONGODB_URI=your-mongodb-connection-string
NEXT_PUBLIC_BASE_URL=https://your-deployed-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Test the System

```bash
# Run comprehensive tests
node scripts/test-email-tracking.js

# Run load test
node scripts/test-email-tracking.js load
```

### 4. Send Tracked Emails

```javascript
// Use the enhanced email API
const response = await fetch('/api/emails/send-advisory-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    advisoryId: 'your-advisory-id',
    recipientEmails: ['user@example.com'],
    customMessage: 'Custom message',
    trackingConfig: {
      trackOpens: true,
      trackClicks: true,
      trackDevice: true
    }
  })
});
```

## Core Components

### 1. Database Models (`models/EmailTracking.js`)

**EmailTracking Collection:**
- `trackingId`: Unique identifier for each email
- `emailId`: Original email/advisory ID
- `recipientEmail`: Recipient address
- `senderEmail`: Sender address
- `subject`: Email subject
- `campaignId`: Campaign identifier
- `trackingConfig`: Configuration options
- `metrics`: Real-time engagement metrics

**TrackingEvent Collection:**
- `trackingId`: Reference to EmailTracking
- `eventType`: 'open', 'click', 'bounce', etc.
- `timestamp`: Event timestamp
- `ipAddress`: Client IP address
- `userAgent`: Client user agent
- `device`: Parsed device information
- `linkUrl`: Clicked link (for click events)

### 2. Tracking Service (`lib/emailTrackingService.js`)

**Key Methods:**
- `initializeTracking()`: Create new tracking record
- `logEvent()`: Record tracking events
- `getAnalytics()`: Retrieve engagement analytics
- `getTrackingEvents()`: Get detailed event list
- `parseUserAgent()`: Extract device information

### 3. API Endpoints

**Tracking Pixel (`/api/track/pixel`)**
```
GET /api/track/pixel?t=TRACKING_ID&r=RANDOM_PARAM
Returns: 1x1 transparent GIF
Side Effect: Logs email open event
```

**Link Tracking (`/api/track/link`)**
```
GET /api/track/link?t=TRACKING_ID&u=ENCODED_URL&l=LINK_ID
Returns: HTTP redirect to original URL
Side Effect: Logs click event
```

**Analytics API (`/api/tracking/analytics`)**
```
GET /api/tracking/analytics?trackingId=ID&campaignId=ID&dateRange=7d
Returns: Comprehensive analytics data
```

### 4. Email Template Generator (`lib/enhancedEmailTemplateGenerator.js`)

**Features:**
- Responsive HTML design
- Embedded tracking pixel
- Automatic link tracking
- Dark mode support
- Professional styling

## Usage Examples

### Initialize Tracking

```javascript
const EmailTrackingService = require('./lib/emailTrackingService');
const trackingService = new EmailTrackingService(mongoConnection);

const tracking = await trackingService.initializeTracking({
  emailId: 'advisory_123',
  recipientEmail: 'user@example.com',
  senderEmail: 'noreply@inteldesk.com',
  subject: 'Security Advisory',
  campaignId: 'monthly_advisory',
  trackingConfig: {
    trackOpens: true,
    trackClicks: true,
    trackDevice: true
  }
});

console.log('Tracking ID:', tracking.trackingId);
console.log('Pixel URL:', tracking.pixelUrl);
```

### Generate Tracked Email

```javascript
const EnhancedEmailTemplateGenerator = require('./lib/enhancedEmailTemplateGenerator');
const generator = new EnhancedEmailTemplateGenerator(trackingService);

const emailData = await generator.generateTrackedThreatAdvisory({
  advisory: advisoryData,
  recipient: { email: 'user@example.com' },
  sender: { email: 'security@company.com' },
  customMessage: 'Please review this security advisory.',
  campaignId: 'security_alerts',
  trackingConfig: {
    trackOpens: true,
    trackClicks: true
  }
});

// emailData contains:
// - trackingId
// - html (tracked HTML content)
// - text (plain text version)
// - pixelUrl
// - trackLinkFunction
```

### Retrieve Analytics

```javascript
const analytics = await trackingService.getAnalytics({
  trackingId: 'et_abc123def456',
  includeEvents: true
});

console.log('Open Rate:', analytics.statistics.openRate + '%');
console.log('Click Rate:', analytics.statistics.clickRate + '%');
console.log('Device Breakdown:', analytics.deviceBreakdown);
```

## Security Features

### URL Validation
All tracked links are validated to prevent:
- XSS attacks via javascript: URLs
- Open redirect vulnerabilities
- Internal network access

### IP Address Handling
- IPv4 and IPv6 support
- Proxy detection via X-Forwarded-For
- Anonymization options available

### Data Privacy
- Configurable TTL for automatic cleanup
- GDPR-compliant data handling
- Optional location tracking

## Performance Optimization

### Database Indexes
- Tracking ID index for fast lookups
- Compound indexes for analytics queries
- TTL index for automatic cleanup

### Caching Strategy
- Pixel responses cached for 24 hours
- Analytics data cached for 5 minutes
- Event batching for high-volume scenarios

### Asynchronous Processing
- Non-blocking pixel responses
- Background event logging
- Batch processing for analytics

## Monitoring and Debugging

### Logging
Enable detailed logging in development:
```bash
DEBUG_EMAIL_TRACKING=true
LOG_TRACKING_EVENTS=true
```

### Health Checks
Monitor system health via:
- Database connection status
- Event processing rate
- Error rates by endpoint

### Common Issues

**Tracking not working:**
1. Check NEXT_PUBLIC_BASE_URL is not localhost
2. Verify MongoDB connection
3. Ensure tracking pixel isn't blocked by ad blockers

**Low open rates:**
1. Check email client image loading settings
2. Verify pixel URL accessibility
3. Test with different email clients

**Performance issues:**
1. Check database indexes
2. Monitor event processing rate
3. Consider batch processing for high volume

## API Reference

### Send Tracked Advisory Email

**Endpoint:** `POST /api/emails/send-advisory-enhanced`

**Request Body:**
```json
{
  "advisoryId": "string",
  "recipientEmails": ["string"],
  "customMessage": "string (optional)",
  "campaignId": "string (optional)",
  "trackingConfig": {
    "trackOpens": "boolean",
    "trackClicks": "boolean",
    "trackDevice": "boolean",
    "trackLocation": "boolean"
  }
}
```

**Response:**
```json
{
  "success": true,
  "trackingIds": ["string"],
  "sentEmails": number,
  "errors": []
}
```

### Get Tracking Analytics

**Endpoint:** `GET /api/tracking/analytics`

**Query Parameters:**
- `trackingId`: Specific tracking ID
- `campaignId`: Campaign identifier
- `dateRange`: Time period (1d, 7d, 30d, 90d)
- `includeEvents`: Include event details

**Response:**
```json
{
  "statistics": {
    "totalEmails": number,
    "totalOpens": number,
    "uniqueOpens": number,
    "totalClicks": number,
    "uniqueClicks": number,
    "openRate": number,
    "clickRate": number
  },
  "deviceBreakdown": {
    "desktop": number,
    "mobile": number,
    "tablet": number
  },
  "browserBreakdown": {},
  "timeline": [],
  "events": []
}
```

## Deployment Checklist

- [ ] Update `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Configure MongoDB Atlas connection
- [ ] Set up SMTP credentials
- [ ] Run database setup script
- [ ] Test pixel endpoint accessibility
- [ ] Verify link tracking redirects
- [ ] Configure monitoring and alerts
- [ ] Set up log aggregation
- [ ] Test with various email clients
- [ ] Validate analytics accuracy

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review test script output
3. Enable debug logging
4. Check MongoDB connection and indexes
5. Verify environment configuration

## License

This email tracking system is part of the Threat Advisory platform and follows the same licensing terms.
