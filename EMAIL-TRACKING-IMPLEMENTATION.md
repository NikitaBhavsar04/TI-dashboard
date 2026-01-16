# Email Tracking Implementation Guide

## Overview
Implemented 1x1 pixel email tracking system with read receipts and double-tick UI indicators.

## Features Implemented

### 1. **Tracking Pixel System**
- Invisible 1x1 transparent GIF embedded in all scheduled emails
- Tracks email opens automatically when recipient loads images
- Records multiple opens with timestamps, IP addresses, and user agents

### 2. **Database Schema Updates**
**ScheduledEmail Model** (`models/ScheduledEmail.ts`):
- `trackingId` - Unique identifier for tracking pixel URL
- `opens` - Array of open events with timestamp, IP, and user agent
- `openedAt` - Timestamp of first open
- `isOpened` - Boolean flag for quick status checks

### 3. **API Endpoints**

#### Track Email Opens
**Endpoint**: `GET /api/track-email/[trackingId]`
- Receives pixel load requests
- Records open event in database
- Returns 1x1 transparent GIF
- Includes cache-control headers to ensure tracking on every load

### 4. **Email Processing Updates**

#### agenda.js (Scheduled Email Processor)
- Generates unique tracking ID using `crypto.randomBytes(32).toString('hex')`
- Constructs tracking pixel URL: `{BASE_URL}/api/track-email/{trackingId}`
- Injects pixel before `</body>` tag in email HTML
- Pixel format: `<img src="{trackingUrl}" width="1" height="1" style="display:block;width:1px;height:1px;" alt="" />`

### 5. **UI Enhancements**

#### Scheduled Emails Manager (`components/ScheduledEmailsManager.tsx`)
**Read Status Badges**:
- ✓ **Single Check (Gray)**: Email delivered but not opened
- ✓✓ **Double Check (Blue)**: Email opened/read

**Information Display**:
- First opened timestamp
- Total number of opens
- Hover tooltip shows all open events
- Real-time status updates

**Visual Indicators**:
```tsx
// Not Opened
<Check className="h-3 w-3" /> Delivered

// Opened
<CheckCheck className="h-3 w-3" /> Read
```

## How It Works

### Email Send Flow
1. User schedules or sends email
2. System generates unique tracking ID
3. Tracking pixel URL created with tracking ID
4. Pixel embedded in email HTML before `</body>` tag
5. Email sent to recipients

### Tracking Flow
1. Recipient opens email
2. Email client loads images (including tracking pixel)
3. Pixel load triggers GET request to `/api/track-email/[trackingId]`
4. API logs open event (timestamp, IP, user agent)
5. Database updated with open status
6. Returns transparent pixel to complete image load

### UI Display Flow
1. Admin views scheduled emails page
2. Component fetches all scheduled emails with tracking data
3. Displays read status badges based on `isOpened` flag
4. Shows detailed tracking info (opens count, timestamps)
5. Auto-refreshes to show latest status

## Technical Details

### Security Features
- Tracking IDs are 64-character random hex strings (256-bit entropy)
- No sensitive information in tracking URLs
- IP addresses and user agents stored securely
- Email content never exposed through tracking system

### Privacy Considerations
- Tracking is automatic for all scheduled emails
- Opens tracked include:
  - Timestamp of each open
  - IP address (anonymized in UI)
  - User agent string (email client/browser info)
- Multiple opens tracked (e.g., forwarded emails, multiple reads)

### Performance
- Tracking pixel is 1x1 transparent GIF (43 bytes)
- Cached with no-store headers to ensure accurate tracking
- Asynchronous database updates don't block email display
- Graceful fallback if tracking fails (still displays pixel)

## Environment Variables

Ensure these are set in `.env`:
```bash
NEXTAUTH_URL=https://your-domain.com  # Used for tracking pixel URL
MONGODB_URI=mongodb://...             # Database for tracking storage
```

## Files Modified

1. **models/ScheduledEmail.ts** - Added tracking fields
2. **pages/api/track-email/[trackingId].ts** - New tracking endpoint
3. **lib/agenda.js** - Added tracking ID generation and pixel injection
4. **components/ScheduledEmailsManager.tsx** - Added read status UI

## Usage

### For Admins
1. Send/schedule emails as usual
2. View scheduled emails page
3. See real-time read status with tick marks
4. Hover over badges for detailed tracking info
5. Monitor email engagement

### Tracking Data Available
- **Delivered** (Single ✓): Email sent successfully
- **Read** (Double ✓✓): Email opened by recipient
- **Opens Count**: Total number of times email was opened
- **First Open Time**: When email was first viewed
- **All Open Events**: Complete history with timestamps and metadata

## Limitations & Notes

### Email Client Compatibility
- **Works**: Gmail, Outlook, Apple Mail (with images enabled)
- **Limited**: Email clients with images disabled by default
- **Blocked**: Plain text email clients

### Tracking Accuracy
- Only tracks when images are loaded
- Recipients can block tracking by disabling images
- VPNs/proxies may affect IP address accuracy
- Multiple forwards create multiple open events

### Best Practices
- Inform recipients that tracking is enabled (privacy policy)
- Use aggregated statistics for reports
- Don't rely solely on tracking for delivery confirmation
- Consider tracking as engagement metric, not absolute count

## Future Enhancements

Potential additions:
- Link click tracking
- Geographic location from IP
- Email client detection from user agent
- Engagement time analysis (time between sends/opens)
- Bulk tracking reports/exports
- Webhook notifications on email opens
- A/B testing for email content

## Troubleshooting

### Tracking Not Working
1. Check `NEXTAUTH_URL` environment variable
2. Verify MongoDB connection
3. Ensure tracking pixel in email HTML
4. Check email client allows images
5. Review API logs for errors

### Opens Not Recording
1. Confirm `trackingId` generated before send
2. Check database write permissions
3. Verify API endpoint accessible
4. Review network logs in browser devtools

### False Opens
- Email scanning tools may trigger opens
- Forwarded emails create new opens
- Preview panes count as opens
- Consider using first-open timestamp for accuracy

## Support

For issues or questions:
1. Check console logs for tracking ID generation
2. Verify pixel injection in sent emails
3. Test tracking endpoint manually: `/api/track-email/test-id`
4. Review database for tracking records
