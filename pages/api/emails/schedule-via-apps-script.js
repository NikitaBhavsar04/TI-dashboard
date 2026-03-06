// This endpoint is no longer in use.
// Email scheduling has been migrated from Google Apps Script to Agenda.js (SMTP/M365).
// Use /api/emails/send-advisory instead.
export default function handler(req, res) {
  return res.status(410).json({
    error: 'This endpoint is no longer in use. Use /api/emails/send-advisory for scheduling.',
    migration: 'Scheduling now handled by Agenda.js with SMTP/M365'
  });
}
