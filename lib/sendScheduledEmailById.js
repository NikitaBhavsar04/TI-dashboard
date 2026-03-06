/**
 * sendScheduledEmailById.js
 *
 * Sends a scheduled email by its MongoDB ID.
 * Uses SMTP + app password only — same as the working "Send Now" button.
 * No Graph API, no certificates.
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Client: OpenSearchClient } = require('@opensearch-project/opensearch');
const { generateAdvisory4EmailTemplate } = require('./advisory4TemplateGenerator');

// OpenSearch client
const osClient = new OpenSearchClient({
  node: process.env.OPENSEARCH_URL || `https://${process.env.OPENSEARCH_HOST || 'localhost'}:${process.env.OPENSEARCH_PORT || '9200'}`,
  ssl: { rejectUnauthorized: false },
  ...(process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD
    ? { auth: { username: process.env.OPENSEARCH_USERNAME, password: process.env.OPENSEARCH_PASSWORD } }
    : {})
});
const ADVISORY_INDEX = 'ti-generated-advisories';

/**
 * @param {string} emailId       - MongoDB _id of the ScheduledEmail document
 * @param {object} ScheduledEmail - Mongoose model
 */
async function sendScheduledEmailById(emailId, ScheduledEmail) {
  // Atomic mutex — change status pending→processing so only one caller proceeds.
  // Works even if Agenda and the cron both fire at the same time.
  const mongoose = require('mongoose');
  const id = mongoose.Types.ObjectId.isValid(emailId) ? new mongoose.Types.ObjectId(emailId) : emailId;
  const claimed = await ScheduledEmail.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'processing', lockedAt: new Date() } },
    { new: false }
  );
  if (!claimed) {
    console.log(`[SEND] Email ${emailId} already processing or sent — skipping`);
    return;
  }
  console.log(`[SEND] Claimed email ${emailId} — proceeding to send`);

  // Load the full document — use the Mongoose model for the document itself,
  // but also read body/emailType directly via the raw MongoDB driver because
  // the cached Mongoose model may not yet have these fields in its schema.
  const scheduledEmail = await ScheduledEmail.findById(id);
  if (!scheduledEmail) throw new Error(`ScheduledEmail ${emailId} not found after claim`);

  // Read body and emailType directly from MongoDB (bypasses Mongoose schema cache)
  const rawDoc = await ScheduledEmail.collection.findOne(
    { _id: id },
    { projection: { body: 1, emailType: 1 } }
  );
  const storedBody = rawDoc && rawDoc.body ? rawDoc.body : null;
  const storedEmailType = rawDoc && rawDoc.emailType ? rawDoc.emailType : 'general';
  console.log(`[SEND] Raw MongoDB read — emailType: '${storedEmailType}', hasBody: ${!!storedBody}, bodyLen: ${storedBody ? storedBody.length : 0}`);

  // 2. Fetch advisory from OpenSearch
  console.log(`[SEND] Fetching advisory ${scheduledEmail.advisoryId}`);
  const osResponse = await osClient.get({ index: ADVISORY_INDEX, id: scheduledEmail.advisoryId });
  if (!osResponse.body._source) throw new Error(`Advisory ${scheduledEmail.advisoryId} not found in OpenSearch`);
  const advisory = { ...osResponse.body._source, _id: scheduledEmail.advisoryId };
  console.log(`[SEND] Advisory: ${advisory.title || advisory.advisory_id}`);

  // 3. Build email HTML.
  // Preferred: use the body that was pre-generated and stored when the email was queued.
  // This guarantees IOC detection data is exactly correct (dedicated vs. general, right client).
  // Fallback: regenerate from OpenSearch data using emailType + client_id matching.
  let emailBody;

  if (storedBody) {
    // Use stored body — already contains correct IOC section (or none) for this recipient
    emailBody = storedBody;
    console.log(`[SEND] ✅ Using stored pre-generated email body (${emailBody.length} chars)`);
    console.log(`[SEND] Stored body contains IOC section: ${emailBody.includes('IOC DETECTION ALERT')}`);
  } else {
    // Legacy fallback: regenerate body from OpenSearch advisory data.
    // Only include IOC detection for dedicated emails where this client is confirmed impacted.
    console.log(`[SEND] ⚠️ No stored body — regenerating from OpenSearch data (emailType='${storedEmailType}')`);
    let iocDetectionData = null;
    if (
      storedEmailType === 'dedicated' &&
      advisory.ip_sweep &&
      Array.isArray(advisory.ip_sweep.impacted_clients) &&
      advisory.ip_sweep.impacted_clients.length > 0
    ) {
      const impacted = advisory.ip_sweep.impacted_clients.find(ic =>
        ic.client_id === scheduledEmail.clientId || ic.client_name === scheduledEmail.clientName
      );
      if (impacted && impacted.matches && impacted.matches.length > 0) {
        iocDetectionData = {
          client_name: impacted.client_name || scheduledEmail.clientName,
          checked_at: advisory.ip_sweep.checked_at,
          match_count: impacted.matches.length,
          matches: impacted.matches
        };
        console.log(`[SEND] Found IOC match for client '${scheduledEmail.clientId}' — including detection alert`);
      } else {
        console.log(`[SEND] Client '${scheduledEmail.clientId}' not in impacted_clients — sending without IOC alert`);
      }
    }
    emailBody = generateAdvisory4EmailTemplate(advisory, scheduledEmail.customMessage || '', iocDetectionData);
  }

  // 5. Tracking pixel
  if (!scheduledEmail.trackingId) {
    scheduledEmail.trackingId = crypto.randomBytes(32).toString('hex');
    await scheduledEmail.save();
  }
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const trackingPixel = baseUrl
    ? `<img src="${baseUrl}/api/track-email/${scheduledEmail.trackingId}" width="1" height="1" style="display:block;width:1px;height:1px;" alt="" />`
    : '';
  const trackedBody = emailBody.includes('</body>')
    ? emailBody.replace('</body>', `${trackingPixel}</body>`)
    : emailBody + trackingPixel;

  // 6. Send via SMTP + app password
  const recipients = Array.isArray(scheduledEmail.to) ? scheduledEmail.to : [scheduledEmail.to];

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser) throw new Error('SMTP_USER is not set in .env');
  if (!smtpPass) throw new Error('SMTP_PASS is not set in .env');

  console.log(`[SEND] SMTP: ${process.env.SMTP_HOST || 'smtp.office365.com'}:${process.env.SMTP_PORT || '587'}`);
  console.log(`[SEND] From: ${smtpUser}`);
  console.log(`[SEND] To: ${recipients.join(', ')}`);
  console.log(`[SEND] Subject: ${scheduledEmail.subject}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false }
  });

  const mailOptions = {
    from: smtpUser,
    to: recipients.join(', '),
    subject: scheduledEmail.subject,
    html: trackedBody
  };
  if (scheduledEmail.cc && scheduledEmail.cc.length > 0)
    mailOptions.cc = Array.isArray(scheduledEmail.cc) ? scheduledEmail.cc.join(', ') : scheduledEmail.cc;
  if (scheduledEmail.bcc && scheduledEmail.bcc.length > 0)
    mailOptions.bcc = Array.isArray(scheduledEmail.bcc) ? scheduledEmail.bcc.join(', ') : scheduledEmail.bcc;

  const info = await transporter.sendMail(mailOptions);
  transporter.close();
  console.log(`[SEND] ✅ Sent — Message-ID: ${info.messageId}`);

  // 7. Mark sent
  scheduledEmail.status = 'sent';
  scheduledEmail.sentAt = new Date();
  await scheduledEmail.save();
  console.log(`[SEND] ✅ Email ${emailId} marked as sent`);
}

module.exports = { sendScheduledEmailById };
