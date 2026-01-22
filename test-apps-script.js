/**
 * Test Google Apps Script Integration
 * 
 * This script tests the Apps Script email scheduling functionality
 */

require('dotenv').config();
const appsScriptScheduler = require('./lib/appsScriptScheduler');

async function testAppsScriptIntegration() {
  console.log('🧪 Testing Google Apps Script Integration...\n');

  try {
    // Step 1: Check if Apps Script is configured
    console.log('1️⃣ Checking configuration...');
    if (!process.env.APPS_SCRIPT_URL) {
      console.log('❌ APPS_SCRIPT_URL not configured in .env.local');
      console.log('📝 Please follow GOOGLE-APPS-SCRIPT-SETUP.md to set it up');
      return;
    }
    console.log('APPS_SCRIPT_URL found:', process.env.APPS_SCRIPT_URL.substring(0, 50) + '...');

    // Step 2: Health check
    console.log('\n2️⃣ Performing health check...');
    const isOnline = await appsScriptScheduler.healthCheck();
    if (!isOnline) {
      console.log('❌ Apps Script is not accessible');
      console.log('📝 Please check your deployment URL and ensure the Web App is deployed');
      return;
    }
    console.log('Apps Script is online and accessible');

    // Step 3: Schedule a test email (2 minutes from now)
    console.log('\n3️⃣ Scheduling test email...');
    const scheduledTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    
    const testEmailData = {
      to: 'test@example.com', // Change this to your email for testing
      subject: 'Test Email from Threat Advisory - Apps Script',
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h1 style="color: #1a73e8;">Success!</h1>
            <p>Your Google Apps Script integration is working correctly.</p>
            <p><strong>Scheduled Time:</strong> ${scheduledTime.toLocaleString()}</p>
            <p><strong>Actual Send Time:</strong> ${new Date().toLocaleString()}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This is a test email from your Threat Advisory platform.
            </p>
          </body>
        </html>
      `,
      scheduledTime: scheduledTime.toISOString(),
      trackingId: 'TEST_' + Date.now(),
      advisoryId: 'TEST_ADV_001'
    };

    const result = await appsScriptScheduler.scheduleEmail(testEmailData);
    console.log('Email scheduled successfully!');
    console.log('📧 Email ID:', result.emailId);
    console.log('⏰ Scheduled for:', result.scheduledTime);

    // Step 4: Check email status
    console.log('\n4️⃣ Checking email status...');
    const status = await appsScriptScheduler.checkStatus(result.emailId);
    console.log('Email status:', status.status);
    console.log('📊 Full status:', JSON.stringify(status, null, 2));

    // Step 5: List all scheduled emails
    console.log('\n5️⃣ Listing all scheduled emails...');
    const emails = await appsScriptScheduler.listScheduledEmails();
    console.log(`Found ${emails.length} scheduled email(s)`);
    
    if (emails.length > 0) {
      console.log('\n📋 Scheduled emails:');
      emails.forEach((email, index) => {
        console.log(`\n${index + 1}. Email ID: ${email.id}`);
        console.log(`   To: ${email.to}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Status: ${email.status}`);
        console.log(`   Scheduled: ${email.scheduledTime}`);
      });
    }

    // Step 6: Optional - Cancel the test email
    console.log('\n6️⃣ Do you want to cancel the test email? (It will send in 2 minutes)');
    console.log('   To cancel, run: node cancel-test-email.js ' + result.emailId);

    console.log('\n🎉 All tests passed!');
    console.log('📧 Check your email inbox in ~2 minutes for the test email');
    console.log('📊 Monitor Apps Script: https://script.google.com');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📝 Troubleshooting steps:');
    console.error('1. Verify APPS_SCRIPT_URL in .env.local');
    console.error('2. Check Apps Script deployment is active');
    console.error('3. Review GOOGLE-APPS-SCRIPT-SETUP.md');
    console.error('\nFull error:', error);
  }
}

// Run the test
testAppsScriptIntegration();
