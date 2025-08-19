// Test Environment Variable Loading
// File: test-env-loading.js

require('dotenv').config();

console.log('🔍 Environment Variable Test:');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length);
console.log('SMTP_PASS first 4 chars:', process.env.SMTP_PASS?.substring(0, 4));
console.log('SMTP_PASS last 4 chars:', process.env.SMTP_PASS?.substring(process.env.SMTP_PASS.length - 4));
console.log('SMTP_PASS full (masked):', process.env.SMTP_PASS?.replace(/./g, '*'));

// Test the original emailSender
console.log('\n📧 Testing original emailSender...');
const { sendEmail } = require('./lib/emailSender');

async function testOriginalSender() {
  try {
    const result = await sendEmail({
      to: process.env.SMTP_USER,
      subject: 'Test from Original EmailSender',
      body: '<p>This is a test from the original working email sender.</p>'
    });
    console.log('✅ Original emailSender working!');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.log('❌ Original emailSender failed:', error.message);
  }
}

testOriginalSender();
