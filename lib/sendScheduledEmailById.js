/**
 * sendScheduledEmailById.js
 *
 * Sends a scheduled email by its MongoDB ID.
 * Uses dispatchEmail (Graph API first, SMTP fallback) — same path as the
 * "Send Now" button, so delivery behaviour is identical.
 */

const crypto = require('crypto');
const { Client: OpenSearchClient } = require('@opensearch-project/opensearch');
const { generateAdvisory4EmailTemplate } = require('./advisory4TemplateGenerator');
const { dispatchEmail } = require('./emailSender'); // Uses Graph API first, then SMTP — same path as "Send Now"

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

  // 6. Dispatch via Graph API (preferred) or SMTP fallback — same path as "Send Now" button
  const recipients = Array.isArray(scheduledEmail.to) ? scheduledEmail.to : [scheduledEmail.to];
  const fromAddr = scheduledEmail.from || process.env.FROM_EMAIL || process.env.SMTP_USER;

  console.log(`[SEND] From: ${fromAddr}`);
  console.log(`[SEND] To: ${recipients.join(', ')}`);
  console.log(`[SEND] Subject: ${scheduledEmail.subject}`);

  await dispatchEmail({
    from: fromAddr,
    to: recipients,
    cc: scheduledEmail.cc && scheduledEmail.cc.length > 0 ? scheduledEmail.cc : [],
    bcc: scheduledEmail.bcc && scheduledEmail.bcc.length > 0 ? scheduledEmail.bcc : [],
    subject: scheduledEmail.subject,
    html: trackedBody
  });

  // 7. Mark sent
  scheduledEmail.status = 'sent';
  scheduledEmail.sentAt = new Date();
  await scheduledEmail.save();
  console.log(`[SEND] ✅ Email ${emailId} marked as sent`);
}

module.exports = { sendScheduledEmailById };
