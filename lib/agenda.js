// agenda.js
const Agenda = require('agenda');
const mongoose = require('mongoose');
const { sendEmail } = require('./emailSender');
const crypto = require('crypto');
const { generateAdvisory4EmailTemplate } = require('./advisory4TemplateGenerator');
const fs = require('fs');
const path = require('path');
const { Client } = require('@opensearch-project/opensearch');

// Initialize OpenSearch client
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

const nodeUrl = opensearchUrl || `https://${host}:${port}`;

const clientConfig = {
  node: nodeUrl,
  ssl: { rejectUnauthorized: false }
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const osClient = new Client(clientConfig);
const ADVISORY_INDEX = 'ti-generated-advisories';

// Define the ScheduledEmail schema directly since we can't import the TS file
const ScheduledEmailSchema = new mongoose.Schema({
  advisoryId: { type: String, required: true, ref: 'Advisory' },
  to: [{ type: String, required: true, trim: true }],
  cc: [{ type: String, trim: true }],
  bcc: [{ type: String, trim: true }],
  from: { type: String, trim: true },
  sentByName: { type: String, trim: true },
  subject: { type: String, required: true, trim: true },
  customMessage: { type: String, trim: true },
  clientId: { type: String, trim: true },
  clientName: { type: String, trim: true },
  scheduledDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'processing', 'sent', 'failed', 'cancelled'], default: 'pending' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  trackingId: { type: String, unique: true, sparse: true },
  lockedAt: { type: Date },
  opens: [{
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }],
  openedAt: { type: Date },
  isOpened: { type: Boolean, default: false },
  smtpMessageId: { type: String, trim: true },
  smtpResponse: { type: String, trim: true }
});

const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);

// Define Advisory schema for population - complete schema with all fields
const AdvisorySchema = new mongoose.Schema({
  title: String,
  description: String,
  summary: String,
  severity: String,
  category: String,
  author: String,
  publishedDate: Date,
  content: String,
  cvss: Number,
  cveIds: [String],
  tags: [String],
  references: [String],
  iocs: [{
    type: String,
    value: String,
    description: String
  }],
  affectedSystems: [String],
  recommendations: [String]
}, { strict: false }); // Allow additional fields

const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

require('dotenv').config();

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable must be set');
}

// ─── Fresh SMTP transporter per send ─────────────────────────────────────────
// IMPORTANT: Do NOT use pool:true for Microsoft 365.
// A pooled transporter keeps TCP connections open, but M365 silently drops idle
// connections after ~10-30 seconds. When nodemailer tries to reuse the dead
// connection it triggers a 535 re-authentication failure — even though the
// credentials are correct. "Send Now" always worked because it used a fresh
// transport (emailSender.js has no pooling). Scheduled emails failed because
// by the time the job ran the pool connection was stale.
//
// Fix: Create a fresh transporter for every email send. One TCP handshake per
// email is trivially cheap and guarantees a clean authenticated session.
const nodemailer = require('nodemailer');

function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false },
    // No pool: true — fresh connection per send prevents M365 stale-session 535 errors
  });
}

console.log(`📨 SMTP config: ${process.env.SMTP_USER || '(SMTP_USER not set)'} @ ${process.env.SMTP_HOST || 'smtp.office365.com'}`);

/**
 * Send mail using a brand-new transporter on every attempt.
 * Creating fresh transporters avoids the M365 stale-connection 535 problem.
 */
async function sendWithRetry(mailOptions, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Fresh transporter on every attempt — no stale connection reuse
    const transporter = createSmtpTransporter();
    try {
      const info = await transporter.sendMail(mailOptions);
      if (attempt > 1) {
        console.log(`✅ SMTP send succeeded on attempt ${attempt}`);
      }
      transporter.close();
      return info;
    } catch (err) {
      transporter.close();
      lastError = err;
      const isAuthError = err.responseCode === 535 || (err.message && err.message.includes('535'));
      const isConnError = ['ECONNECTION', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(err.code);
      if ((isAuthError || isConnError) && attempt < maxRetries) {
        const delayMs = attempt * 3000; // 3s then 6s backoff
        console.warn(`⚠️ SMTP attempt ${attempt}/${maxRetries} failed: ${err.message.split('\n')[0]}`);
        console.warn(`   Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        break;
      }
    }
  }
  throw lastError;
}
// ─────────────────────────────────────────────────────────────────────────────

const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' },
  processEvery: '10 seconds',  // Check every 10 seconds for better timing accuracy
  maxConcurrency: 20,
  defaultConcurrency: 5,
  defaultLockLifetime: 10000  // 10 seconds
});

let started = false;

agenda.define('send-scheduled-email', async (job, done) => {
  const { emailId } = job.attrs.data;
  try {
    const emailDoc = await ScheduledEmail.findById(emailId);
    if (!emailDoc) return done(new Error('Email not found'));
    if (emailDoc.status !== 'pending') return done();
    
    // Load advisory from OpenSearch
    let advisory = null;
    try {
      console.log(`[SCHEDULED-EMAIL] Fetching advisory from OpenSearch: ${emailDoc.advisoryId}`);
      const response = await osClient.get({
        index: ADVISORY_INDEX,
        id: emailDoc.advisoryId
      });
      
      if (response.body._source) {
        advisory = response.body._source;
        console.log(`✅ Advisory found in OpenSearch: ${advisory.title || advisory.advisory_id}`);
        console.log(`📊 Advisory has: exec_summary=${!!advisory.exec_summary_parts}, content=${!!advisory.content}, cvss=${!!advisory.cvss}`);
      } else {
        console.error(`Advisory not found in OpenSearch: ${emailDoc.advisoryId}`);
        return done(new Error('Advisory not found in OpenSearch'));
      }
    } catch (osError) {
      console.error(`[SCHEDULED-EMAIL] OpenSearch fetch failed:`, osError);
      return done(new Error('Failed to fetch advisory from OpenSearch'));
    }
    
    console.log(`Processing email for advisory: ${advisory ? advisory.title : 'Unknown'}`);
    
    // Generate proper email content
    let emailBody = '';
    
    if (emailDoc.customMessage && emailDoc.customMessage.trim()) {
      // Use custom message if provided
      emailBody = emailDoc.customMessage;
      console.log('Using custom message for email body');
    } else if (advisory) {
      console.log('Generating advisory email content');
      // Generate default advisory email content
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="border-left: 4px solid #dc3545; padding-left: 20px; margin-bottom: 30px;">
              <h1 style="color: #dc3545; margin: 0; font-size: 24px;">ðŸš¨ THREAT ADVISORY</h1>
              <h2 style="color: #333; margin: 10px 0; font-size: 20px;">${advisory.title}</h2>
            </div>
            
            <div style="margin-bottom: 20px;">
              <span style="background: ${advisory.severity === 'Critical' ? '#dc3545' : advisory.severity === 'High' ? '#fd7e14' : advisory.severity === 'Medium' ? '#ffc107' : '#28a745'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${advisory.severity ? advisory.severity.toUpperCase() : 'UNKNOWN'}
              </span>
              ${advisory.cvss ? `<span style="margin-left: 10px; background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">CVSS: ${advisory.cvss}</span>` : ''}
            </div>
            
            ${advisory.summary ? `
            <div style="margin-bottom: 25px; background: #e3f2fd; padding: 15px; border-radius: 4px; border-left: 4px solid #2196f3;">
              <h3 style="color: #1976d2; margin: 0 0 10px 0; font-size: 16px;">Summary</h3>
              <p style="color: #333; line-height: 1.6; margin: 0;">${advisory.summary}</p>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">Description</h3>
              <p style="color: #666; line-height: 1.6; margin: 0;">${advisory.description || 'No description available'}</p>
            </div>
            
            ${advisory.cveIds && advisory.cveIds.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">CVE IDs</h3>
              <div style="background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;">
                ${advisory.cveIds.map(cve => `<span style="display: inline-block; margin: 2px; padding: 2px 8px; background: #856404; color: white; border-radius: 3px; font-size: 12px;">${cve}</span>`).join('')}
              </div>
            </div>
            ` : ''}
            
            ${advisory.content ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">Technical Analysis</h3>
              <div style="color: #666; line-height: 1.6; white-space: pre-wrap; background: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 14px;">${advisory.content}</div>
            </div>
            ` : ''}
            
            ${advisory.iocs && advisory.iocs.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">Indicators of Compromise (IOCs)</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #dc3545;">
                ${advisory.iocs.map(ioc => `
                  <div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 3px; border: 1px solid #dee2e6;">
                    <div style="font-family: monospace; font-size: 13px; color: #dc3545; font-weight: bold;">${ioc.value}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;"><strong>Type:</strong> ${ioc.type} | <strong>Description:</strong> ${ioc.description}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            ${advisory.references && advisory.references.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">References</h3>
              <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
                ${advisory.references.map(ref => `<li><a href="${ref}" style="color: #007bff; text-decoration: none;">${ref}</a></li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
              <p><strong>Category:</strong> ${advisory.category || 'Unknown'}</p>
              <p><strong>Published:</strong> ${advisory.publishedDate ? new Date(advisory.publishedDate).toLocaleDateString() : 'Unknown'}</p>
              <p><strong>Author:</strong> ${advisory.author || 'Unknown'}</p>
              ${advisory.tags && advisory.tags.length > 0 ? `<p><strong>Tags:</strong> ${advisory.tags.join(', ')}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">This is an automated threat advisory from EaglEye IntelDesk Intelligence Platform</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Fallback if no advisory found and no custom message
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #dc3545; margin: 0; font-size: 24px;">ðŸš¨ THREAT ADVISORY</h1>
            <p>This is a scheduled threat advisory notification.</p>
            <p><strong>Advisory ID:</strong> ${emailDoc.advisoryId}</p>
            <p><em>Advisory details could not be loaded at this time.</em></p>
          </div>
        </div>
      `;
      console.log('Using fallback email content');
    }
    
    // Convert to the format expected by sendEmail
    const emailData = {
      to: emailDoc.to.join(', '), // Convert array to string
      subject: emailDoc.subject,
      body: emailBody
    };
    
    console.log(`Sending email with ${emailBody.length} characters of content`);
    await sendEmail(emailData);
    
    emailDoc.status = 'sent';
    emailDoc.sentAt = new Date();
    await emailDoc.save();
    
    console.log(`Email sent successfully to: ${emailDoc.to.join(', ')}`);
    done();
  } catch (err) {
    console.error('Failed to send email:', err);
    try {
      const emailDoc = await ScheduledEmail.findById(emailId);
      if (emailDoc) {
        emailDoc.status = 'failed';
        emailDoc.errorMessage = err.message;
        emailDoc.retryCount = (emailDoc.retryCount || 0) + 1;
        await emailDoc.save();
      }
    } catch (updateErr) {
      console.error('Failed to update email status:', updateErr);
    }
    done(err);
  }
});

// Agenda job: marks schedule time has arrived — does NOT send directly.
// Actual sending is handled by /api/cron/process-emails which runs every minute
// via a fresh HTTP request context (avoids M365 SMTP 535 on long-running processes).
agenda.define('send-scheduled-advisory-email', async (job, done) => {
  const { emailId } = job.attrs.data;
  console.log(`⏰ [AGENDA] Schedule time reached for email ${emailId} — cron will send within 1 minute`);
  done();
});


// Helper function to generate advisory email body with mobile-optimized template
function generateAdvisoryEmailBody(advisory, customMessage = '') {
  // Generate email template dynamically from advisory data
  console.log('📧 Generating email template from advisory data');
  const { generateDashboardStyleEmailTemplate } = require('./emailTemplateGenerator');
  
  try {
    return generateDashboardStyleEmailTemplate(advisory, customMessage);
  } catch (error) {
    console.error('Error generating email template:', error);
    // Fallback to basic template if import fails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Advisory: ${advisory.title || 'Untitled'}</title>
</head>
<body style="font-family: Arial, sans-serif; background: #1f2937; color: #ffffff; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #374151; border-radius: 8px; padding: 30px;">
        <h1 style="color: #60a5fa; text-align: center;">ðŸ›¡ï¸ THREAT ADVISORY</h1>
        <h2 style="color: #ffffff;">${advisory.title || 'Untitled Advisory'}</h2>
        ${customMessage ? `<div style="background: #059669; padding: 15px; border-radius: 6px; margin: 20px 0;"><strong>Message:</strong> ${customMessage}</div>` : ''}
        <p style="color: #e5e7eb;">${advisory.executiveSummary || advisory.summary || advisory.description || 'No description available'}</p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}/advisory/${advisory._id}" style="background: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">ðŸ“„ View Full Report</a>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #6b7280; text-align: center; color: #9ca3af; font-size: 12px;">
            ðŸ¦… EaglEye IntelDesk | Threat Intelligence Platform
        </div>
    </div>
</body>
</html>`;
  }
}

// Agenda event handlers
agenda.on('fail', (err, job) => {
  console.error('Agenda job failed:', job.attrs, err);
});

agenda.on('ready', () => {
  console.log('Agenda started and ready');
});

// Function to start agenda
async function startAgenda() {
  if (!started) {
    await agenda.start();
    started = true;
    console.log('Agenda worker started');
  }
  return agenda;
}

// Auto-start Agenda when this module is first loaded.
// This ensures scheduled jobs are processed from the first API call
// after any server restart — not just after an email API is hit.
startAgenda().catch(err => {
  console.error('Failed to auto-start Agenda:', err);
});

// ─── Built-in email poller ────────────────────────────────────────────────────
// Polls MongoDB every 60 s for due pending emails and sends them via SMTP.
// Runs inside the Next.js process — no external cron-scheduler.js needed.
// The global flag prevents duplicate intervals on hot-reload in dev mode.
if (!global.__emailPollerStarted) {
  global.__emailPollerStarted = true;

  const POLL_INTERVAL_MS = 60 * 1000;

  async function pollAndSendPendingEmails() {
    try {
      const now = new Date();
      const pending = await ScheduledEmail.find({
        status: 'pending',
        scheduledDate: { $lte: now }
      }).lean();

      if (pending.length === 0) return;

      console.log(`[POLLER] Found ${pending.length} pending email(s) to send`);
      const { sendScheduledEmailById } = require('./sendScheduledEmailById');

      for (const doc of pending) {
        const emailId = doc._id.toString();
        try {
          await sendScheduledEmailById(emailId, ScheduledEmail);
          console.log(`[POLLER] ✅ Sent email ${emailId}`);
        } catch (err) {
          console.error(`[POLLER] ❌ Failed email ${emailId}:`, err.message);
          try {
            await ScheduledEmail.findByIdAndUpdate(doc._id, {
              status: 'failed',
              errorMessage: err.message,
              sentAt: new Date(),
              $inc: { retryCount: 1 }
            });
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('[POLLER] Error polling scheduled emails:', err.message);
    }
  }

  // Delay first poll 5 s to let Mongoose finish connecting after server start
  setTimeout(() => {
    console.log('[POLLER] ✅ Email poller started — scanning every 60 s');
    pollAndSendPendingEmails();
    setInterval(pollAndSendPendingEmails, POLL_INTERVAL_MS);
  }, 5000);
}

module.exports = { agenda, startAgenda };