/**
 * Cancel a scheduled email in Google Apps Script
 * 
 * Usage: node cancel-test-email.js <EMAIL_ID>
 */

require('dotenv').config();
const appsScriptScheduler = require('./lib/appsScriptScheduler');

async function cancelEmail() {
  const emailId = process.argv[2];

  if (!emailId) {
    console.log('❌ Please provide an email ID');
    console.log('Usage: node cancel-test-email.js <EMAIL_ID>');
    process.exit(1);
  }

  try {
    console.log(`🚫 Cancelling email: ${emailId}`);
    
    const result = await appsScriptScheduler.cancelEmail(emailId);
    
    console.log('✅ Email cancelled successfully!');
    console.log(result);

  } catch (error) {
    console.error('❌ Failed to cancel email:', error.message);
    process.exit(1);
  }
}

cancelEmail();
