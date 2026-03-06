// This endpoint is no longer in use.
// Email scheduling has been migrated from Google Apps Script to Agenda.js (SMTP/M365).
export default function handler(req, res) {
  return res.status(410).json({
    error: 'This endpoint is no longer in use. Email scheduling now uses Agenda.js.'
  });
}
