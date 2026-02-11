/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  THREAT ADVISORY - GOOGLE APPS SCRIPT EMAIL SCHEDULER                      ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * This script runs on Google's servers 24/7 to handle scheduled email sending
 * No need for local server to be running - emails are sent via native GmailApp
 * 
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │  🧪 TO TEST THIS SCRIPT (Run from function dropdown at top):               │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │  ✅ testScheduleEmail()     - Test scheduling with CC/BCC (sends in 2 min) │
 * │  ✅ testSendImmediately()   - Test immediate email send (sends now)        │
 * │  ✅ runSetup()              - Setup recurring trigger (run ONCE)           │
 * │                                                                            │
 * │  ❌ DO NOT RUN: doPost      - Only works via HTTP POST from Next.js       │
 * │  ❌ DO NOT RUN: doGet       - Only works via HTTP GET from browser        │
 * └────────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │  📋 DEPLOYMENT INSTRUCTIONS:                                               │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │  1. Go to https://script.google.com                                       │
 * │  2. Create new project: "Threat Advisory Email Scheduler"                 │
 * │  3. Paste this code into Code.gs                                          │
 * │  4. Select "runSetup" from dropdown and click Run (grant permissions)     │
 * │  5. Click Deploy → New deployment                                         │
 * │     - Type: Web app                                                       │
 * │     - Execute as: Me                                                      │
 * │     - Who has access: Anyone                                              │
 * │  6. Copy deployment URL to .env file as APPS_SCRIPT_URL                   │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

// ==============================================
// CONFIGURATION
// ==============================================

const SCRIPT_PROPERTIES = PropertiesService.getScriptProperties();
const PENDING_EMAILS_KEY = 'PENDING_EMAILS';
const EMAIL_COUNTER_KEY = 'EMAIL_COUNTER';

// ==============================================
// WEB APP ENDPOINT - Receives scheduling requests
// ==============================================

/**
 * Main endpoint to receive email scheduling requests from Next.js
 * @param {Object} e - Event object containing postData
 */
function doPost(e) {
  try {
    // Validate event object
    if (!e) {
      Logger.log('Error: Event object is undefined. This function should be called via HTTP POST, not directly.');
      return createResponse(400, { 
        error: 'Invalid request: Event object is undefined',
        message: 'This function should be called via HTTP POST request, not run directly in the editor.'
      });
    }
    
    // Validate postData
    if (!e.postData || !e.postData.contents) {
      Logger.log('Error: No POST data received. Request must include JSON data.');
      return createResponse(400, { 
        error: 'No POST data received',
        message: 'Request must include JSON data with an "action" field'
      });
    }
    
    // Parse incoming request
    const data = JSON.parse(e.postData.contents);
    
    Logger.log('Received scheduling request: ' + JSON.stringify(data));
    
    // Validate required fields
    if (!data.action) {
      return createResponse(400, { error: 'Action is required' });
    }
    
    // Route to appropriate handler
    switch (data.action) {
      case 'schedule':
        return handleScheduleEmail(data);
      
      case 'cancel':
        return handleCancelEmail(data);
      
      case 'list':
        return handleListEmails(data);
      
      case 'status':
        return handleCheckStatus(data);
        
      default:
        return createResponse(400, { error: 'Invalid action' });
    }
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse(500, { error: error.toString() });
  }
}

/**
 * GET endpoint for health checks
 */
function doGet(e) {
  return createResponse(200, {
    status: 'online',
    service: 'Threat Advisory Email Scheduler',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    message: 'Apps Script is running correctly. Use POST requests to schedule emails.',
    endpoints: {
      schedule: 'POST with action: "schedule"',
      cancel: 'POST with action: "cancel"',
      list: 'POST with action: "list"',
      status: 'POST with action: "status"'
    }
  });
}

/**
 * ⭐ TEST FUNCTION #1 - Run this to test email scheduling with CC/BCC
 * 
 * HOW TO RUN:
 * 1. Select "testScheduleEmail" from the function dropdown at the top
 * 2. Click the Run button (▶️)
 * 3. Check the Execution Log tab for results
 * 
 * This simulates a scheduling request without needing HTTP POST
 */
function testScheduleEmail() {
  try {
    Logger.log('==============================================');
    Logger.log('📧 TESTING EMAIL SCHEDULING WITH CC/BCC');
    Logger.log('==============================================');
    
    // Get your email for testing
    const myEmail = Session.getActiveUser().getEmail();
    
    // Create test email data
    const testData = {
      action: 'schedule',
      to: myEmail,  // Send to yourself
      subject: '🔒 Test Threat Advisory - CC/BCC Test',
      htmlBody: '<html><body style="font-family: Arial, sans-serif; padding: 20px;"><h1 style="color: #2563eb;">Test Email</h1><p>This is a test email to verify CC and BCC functionality.</p><ul><li>Primary recipient (To): You</li><li>CC recipient: Also you (should be visible)</li><li>BCC recipient: Also you (should NOT be visible in headers)</li></ul><p><strong>If you can see this email, the Apps Script is working! 🎉</strong></p></body></html>',
      scheduledTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
      replyTo: myEmail,
      cc: myEmail,  // CC to yourself
      bcc: myEmail, // BCC to yourself  
      trackingId: 'test-tracking-' + Date.now(),
      advisoryId: 'test-advisory-001'
    };
    
    Logger.log('📤 Test email data:');
    Logger.log('  To: ' + testData.to);
    Logger.log('  CC: ' + testData.cc);
    Logger.log('  BCC: ' + testData.bcc);
    Logger.log('  Subject: ' + testData.subject);
    Logger.log('  Scheduled for: ' + testData.scheduledTime);
    Logger.log('');
    
    // Call the handler directly
    const result = handleScheduleEmail(testData);
    
    Logger.log('📊 Result:');
    Logger.log(JSON.stringify(result, null, 2));
    Logger.log('');
    
    if (result.data && result.data.success) {
      Logger.log('✅ TEST PASSED - Email scheduled successfully!');
      Logger.log('📬 Email ID: ' + result.data.emailId);
      Logger.log('⏰ Scheduled Time: ' + result.data.scheduledTime);
      Logger.log('');
      Logger.log('⏳ Your email will be sent in approximately 2 minutes');
      Logger.log('📧 Check your inbox at: ' + myEmail);
      Logger.log('💡 Look for CC and BCC in the email headers');
    } else {
      Logger.log('❌ TEST FAILED');
      Logger.log(JSON.stringify(result));
    }
    
    Logger.log('==============================================');
    
    return result;
    
  } catch (error) {
    Logger.log('❌ TEST FAILED with error: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return { error: error.toString() };
  }
}

// ==============================================
// EMAIL SCHEDULING HANDLER
// ==============================================

/**
 * Schedule an email for future delivery
 */
function handleScheduleEmail(data) {
  try {
    // Validate email data
    const required = ['to', 'subject', 'htmlBody', 'scheduledTime'];
    for (const field of required) {
      if (!data[field]) {
        return createResponse(400, { error: `${field} is required` });
      }
    }
    
    // Generate unique email ID
    const emailId = generateEmailId();
    
    // Parse scheduled time
    const scheduledTime = new Date(data.scheduledTime);
    if (isNaN(scheduledTime.getTime())) {
      return createResponse(400, { error: 'Invalid scheduledTime format' });
    }
    
    // Prepare email object
    const emailData = {
      id: emailId,
      to: data.to,
      subject: data.subject,
      htmlBody: data.htmlBody,
      replyTo: data.replyTo || null,
      cc: data.cc || null,
      bcc: data.bcc || null,
      attachments: data.attachments || [],
      scheduledTime: scheduledTime.toISOString(),
      createdAt: new Date().toISOString(),
      status: 'scheduled',
      trackingId: data.trackingId || null,
      advisoryId: data.advisoryId || null,
      clientId: data.clientId || null
    };
    
    // Store email data
    storeEmail(emailData);
    
    // Create time-based trigger
    const trigger = createTrigger(scheduledTime, emailId);
    
    Logger.log(`Email ${emailId} scheduled for ${scheduledTime}`);
    Logger.log(`Email details - To: ${emailData.to}, CC: ${emailData.cc || 'none'}, BCC: ${emailData.bcc ? 'present' : 'none'}`);
    
    return createResponse(200, {
      success: true,
      emailId: emailId,
      scheduledTime: scheduledTime.toISOString(),
      message: 'Email scheduled successfully'
    });
    
  } catch (error) {
    Logger.log('Error scheduling email: ' + error.toString());
    return createResponse(500, { error: error.toString() });
  }
}

// ==============================================
// EMAIL SENDING FUNCTION
// ==============================================

/**
 * This function is triggered at the scheduled time
 * Time-based triggers can't pass parameters, so we check which emails should be sent
 */
function sendScheduledEmail() {
  try {
    Logger.log('Trigger fired: Checking for emails to send...');
    
    // Get all scheduled emails
    const emails = getAllEmails();
    const now = new Date();
    
    // Find emails that should be sent now (within 5 minute window)
    const emailsToSend = emails.filter(email => {
      if (email.status !== 'scheduled') return false;
      
      const scheduledTime = new Date(email.scheduledTime);
      const timeDiff = now - scheduledTime;
      
      // Send if scheduled time has passed and within 5 minutes
      return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
    });
    
    Logger.log(`Found ${emailsToSend.length} email(s) to send`);
    
    // Send each email
    for (const emailData of emailsToSend) {
      try {
        sendEmailNow(emailData);
      } catch (error) {
        Logger.log(`Failed to send email ${emailData.id}: ${error.toString()}`);
      }
    }
    
  } catch (error) {
    Logger.log(`Error in sendScheduledEmail: ${error.toString()}`);
  }
}

/**
 * Actually send the email via Gmail
 */
function sendEmailNow(emailData) {
  try {
    Logger.log(`Sending email ${emailData.id} to ${emailData.to}`);
    
    if (emailData.status === 'sent') {
      Logger.log(`Email ${emailData.id} already sent`);
      return;
    }
    
    if (emailData.status === 'cancelled') {
      Logger.log(`Email ${emailData.id} was cancelled`);
      deleteEmail(emailData.id);
      return;
    }
    
    // Prepare Gmail options
    const options = {
      htmlBody: emailData.htmlBody,
      name: 'Threat Intelligence Advisory' // Sender name
    };
    
    if (emailData.replyTo) {
      options.replyTo = emailData.replyTo;
    }
    
    if (emailData.cc) {
      options.cc = emailData.cc;
      Logger.log(`Adding CC: ${emailData.cc}`);
    }
    
    if (emailData.bcc) {
      options.bcc = emailData.bcc;
      Logger.log(`Adding BCC: ${emailData.bcc}`);
    }
    
    // Handle attachments (if any)
    if (emailData.attachments && emailData.attachments.length > 0) {
      // Note: Attachments would need to be passed as base64 or URLs
      // This is a simplified version
      Logger.log('Attachments not yet implemented');
    }
    
    // Log HTML length to verify it's being sent
    Logger.log(`Sending HTML email with ${emailData.htmlBody.length} characters`);
    
    // Create plain text version from HTML (simple strip tags)
    const plainText = emailData.htmlBody
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Log email details before sending
    Logger.log(`📧 Sending email to: ${emailData.to}, CC: ${options.cc || 'none'}, BCC: ${options.bcc ? 'present' : 'none'}`);
    
    // Send email via GmailApp with workspace HTML body
    GmailApp.sendEmail(
      emailData.to,
      emailData.subject,
      plainText || 'Please view this email in HTML format.', // Plain text fallback
      options
    );
    
    Logger.log(`Workspace HTML email sent successfully to ${emailData.to}`);
    
    // Update status
    emailData.status = 'sent';
    emailData.sentAt = new Date().toISOString();
    storeEmail(emailData);
    
    // Notify Next.js backend (optional webhook)
    notifyBackend(emailData.id, 'sent', emailData);
    
    // Clean up trigger
    deleteTriggers(emailData.id);
    
  } catch (error) {
    Logger.log(`Error sending email ${emailData.id}: ` + error.toString());
    
    // Update status to failed
    emailData.status = 'failed';
    emailData.error = error.toString();
    emailData.failedAt = new Date().toISOString();
    storeEmail(emailData);
    
    // Notify backend of failure
    notifyBackend(emailData.id, 'failed', emailData);
  }
}

// ==============================================
// CANCEL EMAIL HANDLER
// ==============================================

function handleCancelEmail(data) {
  try {
    if (!data.emailId) {
      return createResponse(400, { error: 'emailId is required' });
    }
    
    const emailData = getEmail(data.emailId);
    
    if (!emailData) {
      return createResponse(404, { error: 'Email not found' });
    }
    
    if (emailData.status === 'sent') {
      return createResponse(400, { error: 'Email already sent' });
    }
    
    // Mark as cancelled
    emailData.status = 'cancelled';
    emailData.cancelledAt = new Date().toISOString();
    storeEmail(emailData);
    
    // Delete associated triggers
    deleteTriggers(data.emailId);
    
    Logger.log(`Email ${data.emailId} cancelled`);
    
    return createResponse(200, {
      success: true,
      message: 'Email cancelled successfully'
    });
    
  } catch (error) {
    Logger.log('Error cancelling email: ' + error.toString());
    return createResponse(500, { error: error.toString() });
  }
}

// ==============================================
// LIST EMAILS HANDLER
// ==============================================

function handleListEmails(data) {
  try {
    const emails = getAllEmails();
    
    return createResponse(200, {
      success: true,
      count: emails.length,
      emails: emails
    });
    
  } catch (error) {
    Logger.log('Error listing emails: ' + error.toString());
    return createResponse(500, { error: error.toString() });
  }
}

// ==============================================
// CHECK STATUS HANDLER
// ==============================================

function handleCheckStatus(data) {
  try {
    if (!data.emailId) {
      return createResponse(400, { error: 'emailId is required' });
    }
    
    const emailData = getEmail(data.emailId);
    
    if (!emailData) {
      return createResponse(404, { error: 'Email not found' });
    }
    
    return createResponse(200, {
      success: true,
      email: emailData
    });
    
  } catch (error) {
    Logger.log('Error checking status: ' + error.toString());
    return createResponse(500, { error: error.toString() });
  }
}

// ==============================================
// STORAGE FUNCTIONS
// ==============================================

function storeEmail(emailData) {
  const emails = getAllEmails();
  
  // Find and update or add new
  const index = emails.findIndex(e => e.id === emailData.id);
  if (index >= 0) {
    emails[index] = emailData;
  } else {
    emails.push(emailData);
  }
  
  // Store back
  SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(emails));
}

function getEmail(emailId) {
  const emails = getAllEmails();
  return emails.find(e => e.id === emailId);
}

function getAllEmails() {
  const stored = SCRIPT_PROPERTIES.getProperty(PENDING_EMAILS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function deleteEmail(emailId) {
  const emails = getAllEmails();
  const filtered = emails.filter(e => e.id !== emailId);
  SCRIPT_PROPERTIES.setProperty(PENDING_EMAILS_KEY, JSON.stringify(filtered));
}

// ==============================================
// TRIGGER MANAGEMENT
// ==============================================

/**
 * Initialize the recurring checker trigger (run this once manually)
 * This creates a trigger that runs every minute to check for emails to send
 */
function setupRecurringTrigger() {
  // Delete any existing triggers for sendScheduledEmail
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendScheduledEmail') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create a new recurring trigger that runs every minute
  ScriptApp.newTrigger('sendScheduledEmail')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  Logger.log('Recurring trigger created - will check for emails every minute');
}

/**
 * No longer needed - we use a single recurring trigger instead
 */
function createTrigger(scheduledTime, emailId) {
  // Ensure the recurring trigger exists
  ensureRecurringTrigger();
  // Email will be sent by the recurring trigger when time comes
  Logger.log(`Email ${emailId} will be sent by recurring trigger at ${scheduledTime}`);
}

/**
 * Ensure the recurring trigger exists
 */
function ensureRecurringTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const hasRecurringTrigger = triggers.some(trigger => 
    trigger.getHandlerFunction() === 'sendScheduledEmail'
  );
  
  if (!hasRecurringTrigger) {
    Logger.log('⚠️ Recurring trigger not found, creating it...');
    setupRecurringTrigger();
  }
}

function deleteTriggers(emailId) {
  // No longer need to delete individual triggers
  // We use a single recurring trigger for all emails
  Logger.log(`Email ${emailId} removed from queue`);
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================
// ==============================================

function generateEmailId() {
  const counter = parseInt(SCRIPT_PROPERTIES.getProperty(EMAIL_COUNTER_KEY) || '0');
  const newCounter = counter + 1;
  SCRIPT_PROPERTIES.setProperty(EMAIL_COUNTER_KEY, newCounter.toString());
  
  const timestamp = Date.now();
  return `EMAIL_${timestamp}_${newCounter}`;
}

function createResponse(statusCode, data) {
  const response = {
    statusCode: statusCode,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function notifyBackend(emailId, status, emailData) {
  try {
    // Optional: Send webhook to your Next.js backend
    // Uncomment and configure if you want status updates sent back
    
    /*
    const webhookUrl = 'YOUR_NEXTJS_WEBHOOK_URL';
    
    const payload = {
      emailId: emailId,
      status: status,
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
    */
    
    Logger.log(`Backend notification: ${emailId} - ${status}`);
  } catch (error) {
    Logger.log('Error notifying backend: ' + error.toString());
  }
}

// ==============================================
// MANUAL TESTING FUNCTIONS
// ==============================================

/**
 * DUPLICATE REMOVED - See testScheduleEmail() at the top of the file
 */

/**
 * ⭐ TEST FUNCTION #2 - Run this to test immediate email sending
 * 
 * HOW TO RUN:
 * 1. Select "testSendImmediately" from the function dropdown at the top
 * 2. Click the Run button (▶️)
 * 3. Check your email inbox
 * 
 * This sends an email immediately (not scheduled) to verify Gmail integration
 */
function testSendImmediately() {
  try {
    const myEmail = Session.getActiveUser().getEmail();
    
    Logger.log('==============================================');
    Logger.log('📧 TESTING IMMEDIATE EMAIL SEND');
    Logger.log('==============================================');
    Logger.log('Sending test email to: ' + myEmail);
    
    GmailApp.sendEmail(
      myEmail,
      '✅ Test Email from Threat Advisory Script',
      'Plain text fallback: Your Google Apps Script is working correctly!',
      {
        htmlBody: '<html><body style="font-family: Arial, sans-serif; padding: 20px;"><h1 style="color: #059669;">✅ Success!</h1><p>Your Google Apps Script is working correctly.</p><ul><li>Gmail integration: ✓</li><li>HTML formatting: ✓</li><li>Apps Script permissions: ✓</li></ul><p><strong>You can now use this script for scheduled emails!</strong></p></body></html>',
        name: 'Threat Intelligence Advisory'
      }
    );
    
    Logger.log('✅ Email sent successfully!');
    Logger.log('📬 Check your inbox at: ' + myEmail);
    Logger.log('==============================================');
    
  } catch (error) {
    Logger.log('❌ Error sending email: ' + error.toString());
  }
}

/**
 * ⭐ SETUP FUNCTION - RUN THIS ONCE AFTER DEPLOYING
 * 
 * HOW TO RUN:
 * 1. Select "runSetup" from the function dropdown at the top
 * 2. Click the Run button (▶️)
 * 3. Grant permissions when prompted
 * 4. Check the Execution Log for confirmation
 * 
 * This creates the recurring trigger that checks for emails every minute
 */
function runSetup() {
  Logger.log('==============================================');
  Logger.log('🚀 SETTING UP THREAT ADVISORY EMAIL SCHEDULER');
  Logger.log('==============================================');
  
  // Create recurring trigger
  setupRecurringTrigger();
  
  Logger.log('');
  Logger.log('✅ Setup complete!');
  Logger.log('📧 The script will now check for scheduled emails every minute');
  Logger.log('💡 You can now schedule emails from your Next.js app');
  Logger.log('');
  Logger.log('NEXT STEPS:');
  Logger.log('1. Deploy this script as a Web App');
  Logger.log('2. Copy the deployment URL');
  Logger.log('3. Add it to your .env file as APPS_SCRIPT_URL');
  Logger.log('==============================================');
}

/**
 * Cleanup old sent emails (run daily)
 * Set up a daily time-based trigger for this function
 */
function cleanupOldEmails() {
  try {
    const emails = getAllEmails();
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    let cleanedCount = 0;
    
    emails.forEach(email => {
      if (email.status === 'sent' && email.sentAt) {
        const sentDate = new Date(email.sentAt);
        if (sentDate < oneDayAgo) {
          deleteEmail(email.id);
          deleteTriggers(email.id);
          cleanedCount++;
        }
      }
    });
    
    Logger.log(`Cleaned up ${cleanedCount} old emails`);
  } catch (error) {
    Logger.log(`Error in cleanup: ${error.toString()}`);
  }
}

/**
 * Clean up all stored data (use with caution!)
 */
function clearAllData() {
  SCRIPT_PROPERTIES.deleteProperty(PENDING_EMAILS_KEY);
  SCRIPT_PROPERTIES.deleteProperty(EMAIL_COUNTER_KEY);
  SCRIPT_PROPERTIES.deleteProperty('TRIGGER_MAPPINGS');
  
  // Delete all triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }
  
  Logger.log('All data cleared!');
}
