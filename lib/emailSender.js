// emailSender.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendEmail({ to, cc, bcc, subject, body }) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html: body
  };

  if (cc && cc.length > 0) {
    mailOptions.cc = cc;
  }

  if (bcc && bcc.length > 0) {
    mailOptions.bcc = bcc;
  }

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };
