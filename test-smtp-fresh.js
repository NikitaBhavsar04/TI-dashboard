const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTP() {
  console.log('🔧 Testing SMTP Configuration');
  console.log('📧 SMTP_USER:', process.env.SMTP_USER);
  console.log('🔑 SMTP_PASS length:', process.env.SMTP_PASS?.length);
  console.log('🔑 SMTP_PASS:', process.env.SMTP_PASS);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    debug: true,
    logger: true
  });

  try {
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP authentication successful!');
    
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'mayank@forensiccybertech.com',
      subject: 'SMTP Test - Fresh Auth',
      text: 'This is a test email to verify SMTP authentication.',
      html: '<h1>SMTP Test - Fresh Auth</h1><p>This is a test email to verify SMTP authentication.</p>'
    });

    console.log('Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testSMTP();
