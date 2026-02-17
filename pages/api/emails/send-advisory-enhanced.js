// Enhanced Email Sending Integration
// File: pages/api/emails/send-advisory-enhanced.js

const EmailTrackingService = require('../../../lib/emailTrackingService');
const EnhancedEmailTemplateGenerator = require('../../../lib/enhancedEmailTemplateGenerator');
const Client = require('../../../models/Client');
const Advisory = require('../../../models/Advisory');
const ScheduledEmail = require('../../../models/ScheduledEmail');
const { verifyToken } = require('../../../lib/auth');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const crypto = require('crypto');

const { agenda } = require('../../../lib/agenda');

async function connectDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  return mongoose.connection;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const connection = await connectDB();

    // Verify admin access
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      advisoryId,
      recipients,
      subject,
      customMessage,
      scheduledDate,
      scheduledTime,
      isScheduled = false,
      trackingConfig = {
        trackOpens: true,
        trackClicks: true,
        trackLocation: false,
        trackDevice: true
      },
      campaignId = null
    } = req.body;

    // Validation
    if (!advisoryId || !recipients || !recipients.length || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify advisory exists
    const advisory = await Advisory.findById(advisoryId);
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Initialize tracking service
    const trackingService = new EmailTrackingService(connection);
    const templateGenerator = new EnhancedEmailTemplateGenerator(trackingService);

    // Process recipients and create email jobs
    const emailJobs = [];
    const trackingRecords = [];

    for (const recipient of recipients) {
      let recipientEmails = [];

      if (recipient.type === 'client' && recipient.id) {
        const client = await Client.findById(recipient.id);
        if (client) {
          recipientEmails = [client.email];
        }
      } else if (recipient.type === 'individual' && recipient.emails) {
        recipientEmails = recipient.emails;
      }

      for (const email of recipientEmails) {
        emailJobs.push({
          advisoryId,
          to: email,
          subject,
          customMessage,
          campaignId: campaignId || `campaign_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        });
      }
    }

    console.log(`📧 Preparing to send ${emailJobs.length} emails with enhanced tracking`);

    // Generate tracked email templates
    const trackedEmails = [];
    
    for (const job of emailJobs) {
      try {
        // Generate tracked email template
        const trackedEmail = await templateGenerator.generateTrackedThreatAdvisory({
          advisory,
          recipient: { email: job.to },
          sender: { email: 'noreply@inteldesk.com' },
          customMessage: job.customMessage,
          campaignId: job.campaignId,
          trackingConfig
        });

        trackedEmails.push({
          ...job,
          html: trackedEmail.html,
          trackingId: trackedEmail.trackingId,
          plainText: templateGenerator.generatePlainTextVersion(
            advisory,
            { email: job.to },
            job.customMessage
          )
        });

        trackingRecords.push({
          email: job.to,
          trackingId: trackedEmail.trackingId
        });

        console.log(`Generated tracked email for ${job.to} - Tracking ID: ${trackedEmail.trackingId}`);

      } catch (error) {
        console.error(`❌ Failed to generate tracked email for ${job.to}:`, error);
      }
    }

    // Schedule or send emails immediately
    const scheduledEmails = [];
    let scheduledAt = new Date();

    if (isScheduled && scheduledDate && scheduledTime) {
      // Parse as UTC first to avoid timezone issues, then convert from IST
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}:00Z`);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const scheduledAtUTC = new Date(scheduleDateTime.getTime() - istOffsetMs);
      
      if (scheduledAtUTC <= new Date()) {
        return res.status(400).json({ message: 'Scheduled time must be in the future' });
      }
      scheduledAt = scheduledAtUTC;
    }

    // Create scheduled email records
    for (const trackedEmail of trackedEmails) {
      const scheduledEmail = new ScheduledEmail({
        advisoryId: mongoose.Types.ObjectId(advisoryId),
        recipientEmail: trackedEmail.to,
        subject: trackedEmail.subject,
        htmlContent: trackedEmail.html,
        textContent: trackedEmail.plainText,
        customMessage: trackedEmail.customMessage,
        scheduledAt,
        status: isScheduled ? 'scheduled' : 'sent',
        trackingId: trackedEmail.trackingId,
        campaignId: trackedEmail.campaignId
      });

      await scheduledEmail.save();
      scheduledEmails.push(scheduledEmail);
    }

    // Schedule email sending jobs
    for (const email of trackedEmails) {
      const jobName = `send-tracked-advisory-${email.trackingId}`;
      
      await agenda.schedule(scheduledAt, 'send enhanced advisory email', {
        emailId: scheduledEmails.find(se => se.trackingId === email.trackingId)._id.toString(),
        trackingId: email.trackingId,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.plainText,
        advisoryId: advisoryId,
        campaignId: email.campaignId
      });
    }

    console.log(`📬 Scheduled ${trackedEmails.length} tracked emails for ${scheduledAt}`);

    return res.status(201).json({
      message: `Successfully ${isScheduled ? 'scheduled' : 'queued'} ${trackedEmails.length} tracked advisory emails`,
      emailCount: trackedEmails.length,
      trackingRecords: trackingRecords.length,
      scheduledAt: scheduledAt.toISOString(),
      campaignIds: [...new Set(trackedEmails.map(e => e.campaignId))],
      trackingSummary: {
        trackOpens: trackingConfig.trackOpens,
        trackClicks: trackingConfig.trackClicks,
        trackLocation: trackingConfig.trackLocation,
        trackDevice: trackingConfig.trackDevice
      }
    });

  } catch (error) {
    console.error('Enhanced email sending error:', error);
    return res.status(500).json({ 
      message: 'Failed to process enhanced email sending',
      error: error.message 
    });
  }
}

// Define the enhanced email sending job
agenda.define('send enhanced advisory email', async (job) => {
  const { 
    emailId, 
    trackingId, 
    to, 
    subject, 
    html, 
    text, 
    advisoryId, 
    campaignId 
  } = job.attrs.data;

  try {
    console.log(`📧 Processing enhanced advisory email job for tracking ID: ${trackingId}`);

    // Create transporter (use your existing SMTP configuration)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Send email with tracking
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Threat Advisory" <noreply@inteldesk.com>',
      to: to,
      subject: subject,
      html: html,
      text: text,
      messageId: `<${trackingId}@inteldesk.com>`,
      headers: {
        'X-Campaign-ID': campaignId,
        'X-Tracking-ID': trackingId,
        'X-Advisory-ID': advisoryId
      }
    });

    console.log(`Enhanced advisory email sent successfully: ${result.messageId}`);

    // Update scheduled email status
    await ScheduledEmail.findByIdAndUpdate(emailId, {
      status: 'sent',
      sentAt: new Date(),
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Enhanced advisory email job failed:', error);
    
    // Update status to failed
    await ScheduledEmail.findByIdAndUpdate(emailId, {
      status: 'failed',
      error: error.message,
      failedAt: new Date()
    });

    throw error;
  }
});
