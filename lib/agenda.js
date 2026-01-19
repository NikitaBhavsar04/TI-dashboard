// agenda.js
const Agenda = require('agenda');
const mongoose = require('mongoose');
const { sendEmail } = require('./emailSender');
const crypto = require('crypto');

require('dotenv').config();

const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory', collection: 'agendaJobs' },
  processEvery: '30 seconds',
  maxConcurrency: 20,
  defaultConcurrency: 5
});

let started = false;

// Define the ScheduledEmail schema directly since we can't import the TS file
const ScheduledEmailSchema = new mongoose.Schema({
  advisoryId: { type: String, required: true, ref: 'Advisory' },
  to: [{ type: String, required: true, trim: true }],
  cc: [{ type: String, trim: true }],
  bcc: [{ type: String, trim: true }],
  subject: { type: String, required: true, trim: true },
  customMessage: { type: String, trim: true },
  scheduledDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  errorMessage: { type: String },
  retryCount: { type: Number, default: 0 },
  trackingId: { type: String, unique: true, sparse: true },
  opens: [{
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String
  }],
  openedAt: { type: Date },
  isOpened: { type: Boolean, default: false }
});

const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);

// Define Advisory schema for population
const AdvisorySchema = new mongoose.Schema({
  title: String,
  description: String,
  summary: String,
  severity: String,
  category: String,
  author: String,
  publishedDate: Date,
  content: String,
  cvss: Number,
  cveIds: [String],
  tags: [String],
  references: [String],
  iocs: [{
    type: String,
    value: String,
    description: String
  }],
  affectedSystems: [String],
  recommendations: [String]
}, { strict: false });

const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

agenda.define('send-scheduled-email', async (job, done) => {
  const { emailId } = job.attrs.data;
  
  try {
    const emailDoc = await ScheduledEmail.findById(emailId);
    if (!emailDoc) return done(new Error('Email not found'));
    if (emailDoc.status !== 'pending') return done();
    
    const advisory = await Advisory.findById(emailDoc.advisoryId);
    if (!advisory) {
      console.log(`Warning: Advisory ${emailDoc.advisoryId} not found`);
      return done(new Error('Advisory not found'));
    }
    
    // Generate email content
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #dc3545;">🚨 THREAT ADVISORY</h1>
          <h2>${advisory.title}</h2>
          <p><strong>Severity:</strong> ${advisory.severity}</p>
          <p>${advisory.description}</p>
          ${emailDoc.customMessage ? `<div style="background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px;"><strong>Message:</strong> ${emailDoc.customMessage}</div>` : ''}
        </div>
      </div>
    `;
    
    const emailData = {
      to: emailDoc.to.join(', '),
      subject: emailDoc.subject,
      body: emailBody
    };
    
    await sendEmail(emailData);
    
    emailDoc.status = 'sent';
    emailDoc.sentAt = new Date();
    await emailDoc.save();
    
    console.log(`Email sent successfully to: ${emailDoc.to.join(', ')}`);
    done();
  } catch (err) {
    console.error('Failed to send email:', err);
    
    try {
      const emailDoc = await ScheduledEmail.findById(emailId);
      if (emailDoc) {
        emailDoc.status = 'failed';
        emailDoc.errorMessage = err.message;
        emailDoc.retryCount = (emailDoc.retryCount || 0) + 1;
        await emailDoc.save();
      }
    } catch (updateErr) {
      console.error('Failed to update email status:', updateErr);
    }
    
    done(err);
  }
});

// Function to start agenda
async function startAgenda() {
  if (started) {
    console.log('Agenda already started');
    return agenda;
  }
  
  try {
    await agenda.start();
    started = true;
    console.log('Agenda started successfully');
  } catch (error) {
    console.error('Failed to start Agenda:', error);
  }
  
  return agenda;
}

module.exports = { agenda, startAgenda };