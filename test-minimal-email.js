// Minimal email test to verify delivery
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testMinimalEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Simple plain text email
    const testEmail = {
      from: process.env.SMTP_USER,
      to: 'mayankrajput2110@gmail.com', // Same email as in database
      subject: 'Simple Test Email',
      text: 'This is a simple test email to verify delivery.',
      html: '<p>This is a simple test email to verify delivery.</p>'
    };

    console.log('📧 Sending minimal test email...');
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Accepted:', info.accepted);
    console.log('❌ Rejected:', info.rejected);
    
    if (info.response) {
      console.log('📋 Server response:', info.response);
    }

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testMinimalEmail();
