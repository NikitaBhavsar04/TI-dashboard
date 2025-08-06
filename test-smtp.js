// Simple SMTP test
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
  try {
    console.log('🔗 Testing SMTP connection...');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('📋 SMTP Configuration:');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`   Pass: ${process.env.SMTP_PASS ? '***' : 'NOT SET'}`);

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    // Send test email
    const testEmail = {
      from: process.env.SMTP_USER,
      to: 'mayank@forensiccybertech.com', // Use the same email as sender for testing
      subject: 'Test Email - Advisory System',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email sent at ${new Date().toLocaleString()}</p>
        <p>If you receive this, the SMTP configuration is working correctly.</p>
      `
    };

    console.log('📧 Sending test email...');
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('📋 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);

  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    if (error.code) {
      console.error('🔍 Error code:', error.code);
    }
  }
}

testSMTP();
