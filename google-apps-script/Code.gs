// =====================================================
// CONFIGURATION
// =====================================================

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const PENDING_EMAILS_KEY = 'PENDING_EMAILS';
const EMAIL_COUNTER_KEY = 'EMAIL_COUNTER';


// =====================================================
// WEB APP ENDPOINT
// =====================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse(400, { error: 'Invalid request' });
    }

    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case 'schedule':
        return createResponse(200, scheduleEmailCore(data));

      case 'cancel':
        return createResponse(200, cancelEmail(data.emailId));

      case 'list':
        return createResponse(200, getAllEmails());

      case 'status':
        return createResponse(200, getEmail(data.emailId));

      default:
        return createResponse(400, { error: 'Invalid action' });
    }

  } catch (error) {
    return createResponse(500, { error: error.toString() });
  }
}

function doGet() {
  return createResponse(200, {
    status: 'online',
    service: 'Threat Advisory Email Scheduler',
    timestamp: new Date().toISOString()
  });
}


// =====================================================
// SCHEDULING CORE
// =====================================================

function scheduleEmailCore(data) {

  const required = ['to', 'subject', 'htmlBody', 'scheduledTime'];
  for (const field of required) {
    if (!data[field]) {
      return { success: false, error: field + ' is required' };
    }
  }

  const scheduledTime = new Date(data.scheduledTime);
  if (isNaN(scheduledTime.getTime())) {
    return { success: false, error: 'Invalid scheduledTime format' };
  }

  const emailId = generateEmailId();

  const emailData = {
    id: emailId,
    to: data.to,
    subject: data.subject,
    htmlBody: data.htmlBody,
    cc: data.cc || null,
    bcc: data.bcc || null,
    replyTo: data.replyTo || null,
    trackingId: data.trackingId || null,
    advisoryId: data.advisoryId || null,
    clientId: data.clientId || null,
    scheduledTime: scheduledTime.toISOString(),
    createdAt: new Date().toISOString(),
    status: 'scheduled'
  };

  storeEmail(emailData);
  ensureTrigger();

  Logger.log("Scheduled email: " + emailId);

  return {
    success: true,
    emailId,
    scheduledTime: scheduledTime.toISOString()
  };
}


// =====================================================
// SCHEDULER (RUNS EVERY MINUTE)
// =====================================================

function sendScheduledEmail() {

  const emails = getAllEmails();
  const now = new Date();

  Logger.log("Scheduler running. Queue size: " + emails.length);

  for (let i = 0; i < emails.length; i++) {

    const email = emails[i];
    if (email.status !== 'scheduled') continue;

    const scheduledTime = new Date(email.scheduledTime);

    if (now >= scheduledTime) {
      Logger.log("Sending email: " + email.id);
      sendEmailNow(email);
    }
  }
}


// =====================================================
// EMAIL SENDING ENGINE
// =====================================================

function sendEmailNow(emailData) {
  try {

    const options = {
      htmlBody: emailData.htmlBody,
      name: 'Threat Intelligence Advisory'
    };

    if (emailData.cc && emailData.cc !== 'none') options.cc = emailData.cc;
    if (emailData.bcc && emailData.bcc !== 'none') options.bcc = emailData.bcc;
    if (emailData.replyTo) options.replyTo = emailData.replyTo;

    const plainText = emailData.htmlBody.replace(/<[^>]+>/g, ' ');

    GmailApp.sendEmail(
      emailData.to,
      emailData.subject,
      plainText,
      options
    );

    Logger.log("Email SENT: " + emailData.id);

    notifyBackend(emailData.id, 'sent', emailData);

    // 🔥 IMPORTANT: remove after send
    deleteEmailFromQueue(emailData.id);

  } catch (error) {

    Logger.log("Email FAILED: " + emailData.id + " " + error);

    notifyBackend(emailData.id, 'failed', emailData);

    // also remove failed mails to prevent storage overflow
    deleteEmailFromQueue(emailData.id);
  }
}


// =====================================================
// STORAGE
// =====================================================

function storeEmail(emailData) {
  const emails = getAllEmails();
  emails.push(emailData);
  SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(emails));
}

function getAllEmails() {
  const stored = SCRIPT_PROPERTIES.getProperty(PENDING_EMAILS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function getEmail(id) {
  return getAllEmails().find(e => e.id === id);
}

function deleteEmailFromQueue(emailId) {
  const emails = getAllEmails();
  const filtered = emails.filter(e => e.id !== emailId);
  SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(filtered));
  Logger.log("Removed from queue: " + emailId);
}

function cancelEmail(id) {
  const emails = getAllEmails().filter(e => e.id !== id);
  SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(emails));
  return { success: true };
}


// =====================================================
// TRIGGER MANAGEMENT
// =====================================================

function ensureTrigger() {

  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === 'sendScheduledEmail');

  if (!exists) {
    ScriptApp.newTrigger('sendScheduledEmail')
      .timeBased()
      .everyMinutes(1)
      .create();

    Logger.log("Trigger created");
  }
}


// =====================================================
// UTILITIES
// =====================================================

function generateEmailId() {
  const counter = parseInt(SCRIPT_PROPERTIES.getProperty(EMAIL_COUNTER_KEY) || '0');
  const newCounter = counter + 1;
  SCRIPT_PROPERTIES.setProperty(EMAIL_COUNTER_KEY, newCounter.toString());
  return "EMAIL_" + Date.now() + "_" + newCounter;
}

function createResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      statusCode,
      data,
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// =====================================================
// WEBHOOK BACKEND NOTIFY
// =====================================================

function notifyBackend(emailId, status, emailData) {
  try {

    const webhookUrl = 'https://ti.eagleyesoc.ai/api/emails/apps-script-webhook';

    const payload = {
      emailId,
      status,
      trackingId: emailData.trackingId,
      advisoryId: emailData.advisoryId,
      clientId: emailData.clientId,
      timestamp: new Date().toISOString()
    };

    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

  } catch (error) {
    Logger.log("Webhook error: " + error);
  }
}


// =====================================================
// RESET (RUN ONCE IF STORAGE FULL)
// =====================================================

function RESET_ALL_SCHEDULED_EMAILS() {
  SCRIPT_PROPERTIES.deleteAllProperties();
  Logger.log("Storage cleared.");
}