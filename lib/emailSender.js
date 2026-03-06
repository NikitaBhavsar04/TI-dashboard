// emailSender.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Legacy single-transporter kept for any direct callers (send-scheduled-email job etc.)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendEmail({ to, cc, bcc, subject, body }) {
  const mailOptions = {
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html: body
  };

  if (cc && cc.length > 0) {
    mailOptions.cc = cc;
  }

  if (bcc && bcc.length > 0) {
    mailOptions.bcc = bcc;
  }

  return transporter.sendMail(mailOptions);
}

/**
 * dispatchEmail — the single authoritative send function used by Agenda jobs and
 * the cron processor.
 *
 * Strategy (mirrors send-now.ts which is confirmed working):
 *   1. Graph API first  — bypasses SMTP AUTH entirely, no 535 risk
 *   2. SMTP fallback    — fresh transporter per call (no pool), avoids M365
 *                         stale-connection 535 errors
 *
 * @param {object} opts
 * @param {string}   opts.from    - Sender address (defaults to FROM_EMAIL / SMTP_USER)
 * @param {string[]} opts.to      - Array of recipient addresses
 * @param {string[]} [opts.cc]
 * @param {string[]} [opts.bcc]
 * @param {string}   opts.subject
 * @param {string}   opts.html    - Full HTML email body
 * @returns {Promise<{method: string, messageId?: string, response?: string}>}
 */
async function dispatchEmail({ from, to, cc, bcc, subject, html }) {
  const fromAddr = from || process.env.FROM_EMAIL || process.env.SMTP_USER;
  const toArr = Array.isArray(to) ? to : [to];

  // ── 1. Try Graph API first ─────────────────────────────────────────────────
  try {
    const { sendMailViaGraph, isGraphMailerAvailable } = require('./graphMailer');
    if (isGraphMailerAvailable()) {
      console.log('[DISPATCH] Sending via Microsoft Graph API...');
      await sendMailViaGraph({
        from: fromAddr,
        to: toArr,
        cc: cc || [],
        bcc: bcc || [],
        subject,
        html
      });
      console.log('[DISPATCH] ✅ Sent via Graph API');
      return { method: 'graph' };
    }
  } catch (graphErr) {
    console.warn('[DISPATCH] Graph API attempt failed:', graphErr.message, '— falling back to SMTP');
  }

  // ── 2. SMTP fallback — fresh transporter, no pool ──────────────────────────
  console.log('[DISPATCH] Sending via SMTP (fresh connection, no pool)...');
  const smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false }
    // No pool:true — avoids M365 stale-session 535 auth errors
  });

  const mailOptions = {
    from: fromAddr,
    to: toArr.join(', '),
    subject,
    html
  };
  if (cc && cc.length > 0)  mailOptions.cc  = cc.join(', ');
  if (bcc && bcc.length > 0) mailOptions.bcc = bcc.join(', ');

  try {
    const info = await smtpTransport.sendMail(mailOptions);
    smtpTransport.close();
    console.log(`[DISPATCH] ✅ Sent via SMTP — Message-ID: ${info.messageId}`);
    return { method: 'smtp', messageId: info.messageId, response: info.response };
  } catch (smtpErr) {
    smtpTransport.close();
    console.error(`[DISPATCH] ❌ SMTP failed: ${smtpErr.message}`);
    throw smtpErr;
  }
}

module.exports = { sendEmail, dispatchEmail };
