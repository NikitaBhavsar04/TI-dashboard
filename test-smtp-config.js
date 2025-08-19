// Test SMTP Configuration
// File: test-smtp-config.js

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPConfig() {
  try {
    console.log('🧪 Testing SMTP Configuration...\n');

    console.log('📧 SMTP Settings:');
    console.log(`   Host: ${process.env.SMTP_HOST}`);
    console.log(`   Port: ${process.env.SMTP_PORT}`);
    console.log(`   User: ${process.env.SMTP_USER}`);
    console.log(`   Pass: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET'}`);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log('\n🔐 Testing SMTP authentication...');
    
    // Verify the connection configuration
    await transporter.verify();
    console.log('✅ SMTP authentication successful!');

    console.log('\n📨 Sending test email...');
    
    // Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: 'SMTP Configuration Test - Threat Advisory System',
      html: `
        <h2>🎉 SMTP Configuration Test Successful!</h2>
        <p>Your email tracking system is now ready to send emails.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>SMTP Host: ${process.env.SMTP_HOST}</li>
          <li>SMTP Port: ${process.env.SMTP_PORT}</li>
          <li>From: ${process.env.SMTP_USER}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>🚀 Your threat advisory emails with tracking will now work correctly!</p>
      `,
      text: 'SMTP Configuration Test Successful! Your email tracking system is ready.'
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📮 Response: ${info.response}`);

  } catch (error) {
    console.error('❌ SMTP Configuration Test Failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Troubleshooting Tips:');
      console.log('1. Verify your Gmail App Password is correct');
      console.log('2. Make sure 2FA is enabled on your Google account');
      console.log('3. Generate a new App Password if needed');
      console.log('4. Remove any spaces from the App Password');
      console.log('5. Don\'t use quotes around the password in .env file');
    }
  }
}

if (require.main === module) {
  testSMTPConfig();
}

module.exports = { testSMTPConfig };
