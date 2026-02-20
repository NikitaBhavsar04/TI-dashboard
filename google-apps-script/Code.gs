// ==============================================
// CONFIGURATION
// ==============================================

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const PENDING_EMAILS_KEY = 'PENDING_EMAILS';
const EMAIL_COUNTER_KEY = 'EMAIL_COUNTER';

// ==============================================
// WEB APP ENDPOINT
// ==============================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse(400, { error: 'Invalid request' });
    }

    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case 'schedule':
        return handleScheduleEmail(data);
      case 'cancel':
        return handleCancelEmail(data);
      case 'list':
        return handleListEmails();
      case 'status':
        return handleCheckStatus(data);
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

// ==============================================
// CORE EMAIL SCHEDULING LOGIC
// ==============================================

function scheduleEmailCore(data) {
  try {
    const required = ['to', 'subject', 'htmlBody', 'scheduledTime'];

    for (const field of required) {
      if (!data[field]) {
        return { success: false, error: `${field} is required` };
      }
    }

    const emailId = generateEmailId();

    const scheduledTime = new Date(data.scheduledTime);
    if (isNaN(scheduledTime.getTime())) {
      return { success: false, error: 'Invalid scheduledTime format' };
    }

    const emailData = {
      id: emailId,
      to: data.to,
      subject: data.subject,
      htmlBody: data.htmlBody,
      replyTo: data.replyTo || null,
      cc: data.cc || null,
      bcc: data.bcc || null,
      trackingId: data.trackingId || null,
      advisoryId: data.advisoryId || null,
      clientId: data.clientId || null,
      scheduledTime: scheduledTime.toISOString(),
      createdAt: new Date().toISOString(),
      status: 'scheduled'
    };

    storeEmail(emailData);
    createTrigger();

    Logger.log(`Email ${emailId} scheduled`);

    return {
      success: true,
      emailId,
      scheduledTime: scheduledTime.toISOString()
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==============================================
// HANDLERS
// ==============================================

function handleScheduleEmail(data) {
  const result = scheduleEmailCore(data);
  if (!result.success) return createResponse(400, result);
  return createResponse(200, result);
}

function handleCancelEmail(data) {
  if (!data.emailId) {
    return createResponse(400, { error: 'emailId required' });
  }

  const email = getEmail(data.emailId);
  if (!email) {
    return createResponse(404, { error: 'Email not found' });
  }

  email.status = 'cancelled';
  storeEmail(email);

  return createResponse(200, { success: true });
}

function handleListEmails() {
  return createResponse(200, {
    success: true,
    emails: getAllEmails()
  });
}

function handleCheckStatus(data) {
  if (!data.emailId) {
    return createResponse(400, { error: 'emailId required' });
  }

  const email = getEmail(data.emailId);
  if (!email) {
    return createResponse(404, { error: 'Email not found' });
  }

  return createResponse(200, { success: true, email });
}

// ==============================================
// EMAIL SENDING ENGINE
// ==============================================

function sendScheduledEmail() {
  const emails = getAllEmails();
  const now = new Date();

  emails.forEach(email => {
    if (email.status !== 'scheduled') return;

    const scheduledTime = new Date(email.scheduledTime);
    if (now >= scheduledTime) {
      sendEmailNow(email);
    }
  });

  cleanupOldEmails();
}

function sendEmailNow(emailData) {
  try {

    const options = {
      htmlBody: emailData.htmlBody,
      name: 'Threat Intelligence Advisory'
    };

    if (emailData.replyTo) options.replyTo = emailData.replyTo;
    if (emailData.cc) options.cc = emailData.cc;
    if (emailData.bcc) options.bcc = emailData.bcc;

    const plainText = emailData.htmlBody.replace(/<[^>]+>/g, ' ');

    GmailApp.sendEmail(
      emailData.to,
      emailData.subject,
      plainText,
      options
    );

    emailData.status = 'sent';
    emailData.sentAt = new Date().toISOString();
    storeEmail(emailData);

    notifyBackend(emailData.id, 'sent', emailData);

    Logger.log(`Email sent: ${emailData.id}`);

  } catch (error) {
    emailData.status = 'failed';
    emailData.error = error.toString();
    emailData.failedAt = new Date().toISOString();
    storeEmail(emailData);

    notifyBackend(emailData.id, 'failed', emailData);
  }
}

// ==============================================
// STORAGE
// ==============================================

function storeEmail(emailData) {
  const emails = getAllEmails();
  const index = emails.findIndex(e => e.id === emailData.id);

  if (index >= 0) emails[index] = emailData;
  else emails.push(emailData);

  SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(emails));
}

function getAllEmails() {
  const stored = SCRIPT_PROPERTIES.getProperty(PENDING_EMAILS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function getEmail(id) {
  return getAllEmails().find(e => e.id === id);
}

function cleanupOldEmails() {
  const emails = getAllEmails();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const emailsToKeep = emails.filter(email => {
    if (email.status === 'scheduled') return true;
    if (email.sentAt && new Date(email.sentAt) > oneDayAgo) return true;
    if (email.failedAt && new Date(email.failedAt) > oneDayAgo) return true;
    return false;
  });

  if (emails.length !== emailsToKeep.length) {
    SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(emailsToKeep));
    Logger.log(`Cleaned up ${emails.length - emailsToKeep.length} old emails`);
  }
}

// ==============================================
// TRIGGERS
// ==============================================

function setupRecurringTrigger() {
  ScriptApp.newTrigger('sendScheduledEmail')
    .timeBased()
    .everyMinutes(1)
    .create();
}

function createTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(t => t.getHandlerFunction() === 'sendScheduledEmail');
  if (!exists) setupRecurringTrigger();
}

// ==============================================
// UTILITIES
// ==============================================

function generateEmailId() {
  const counter = parseInt(SCRIPT_PROPERTIES.getProperty(EMAIL_COUNTER_KEY) || '0');
  const newCounter = counter + 1;
  SCRIPT_PROPERTIES.setProperty(EMAIL_COUNTER_KEY, newCounter.toString());

  return `EMAIL_${Date.now()}_${newCounter}`;
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

// ==============================================
// WEBHOOK NOTIFICATION
// ==============================================

function notifyBackend(emailId, status, emailData) {
  try {
    const webhookUrl = 'https://ti.eagleyesoc.ai/api/emails/apps-script-webhook';

    const payload = {
      emailId,
      status,
      trackingId: emailData.trackingId,
      advisoryId: emailData.advisoryId,
      clientId: emailData.clientId,
      timestamp: new Date().toISOString(),
      errorMessage: emailData.error || null
    };

    Logger.log(`Notifying backend: ${emailId} - ${status}`);

    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    Logger.log(`Backend response: ${response.getResponseCode()}`);

  } catch (error) {
    Logger.log('Webhook error: ' + error.toString());
  }
}