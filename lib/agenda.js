// agenda.js
const Agenda = require('agenda');
const mongoose = require('mongoose');
const { sendEmail } = require('./emailSender');
const crypto = require('crypto');
const { generateAdvisory4EmailTemplate } = require('./advisory4TemplateGenerator');
const fs = require('fs');
const path = require('path');

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

// Define Advisory schema for population - complete schema with all fields
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
}, { strict: false }); // Allow additional fields

const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

require('dotenv').config();

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable must be set');
}

const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' },
  processEvery: '30 seconds',
  maxConcurrency: 20,
  defaultConcurrency: 5
});

let started = false;

agenda.define('send-scheduled-email', async (job, done) => {
  const { emailId } = job.attrs.data;
  try {
    const emailDoc = await ScheduledEmail.findById(emailId);
    if (!emailDoc) return done(new Error('Email not found'));
    if (emailDoc.status !== 'pending') return done();
    
    // Load advisory from eagle_nest file system (not MongoDB)
    let advisory = null;
    try {
      const eagleNestPath = path.join(process.cwd(), 'backend', 'workspace', 'eagle_nest');
      const filePath = path.join(eagleNestPath, `${emailDoc.advisoryId}.json`);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        advisory = JSON.parse(content);
        console.log(`âœ… Advisory found: ${advisory.title || advisory.advisory_id}`);
        console.log(`ðŸ"Š Advisory has: exec_summary=${!!advisory.exec_summary_parts}, content=${!!advisory.content}, cvss=${!!advisory.cvss}`);
      } else {
        console.log(`Warning: Advisory file ${emailDoc.advisoryId}.json not found in eagle_nest`);
      }
    } catch (fileError) {
      console.log(`Warning: Error loading advisory ${emailDoc.advisoryId}:`, fileError.message);
    }
    
    console.log(`Processing email for advisory: ${advisory ? advisory.title : 'Unknown'}`);
    
    // Generate proper email content
    let emailBody = '';
    
    if (emailDoc.customMessage && emailDoc.customMessage.trim()) {
      // Use custom message if provided
      emailBody = emailDoc.customMessage;
      console.log('Using custom message for email body');
    } else if (advisory) {
      console.log('Generating advisory email content');
      // Generate default advisory email content
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="border-left: 4px solid #dc3545; padding-left: 20px; margin-bottom: 30px;">
              <h1 style="color: #dc3545; margin: 0; font-size: 24px;">ðŸš¨ THREAT ADVISORY</h1>
              <h2 style="color: #333; margin: 10px 0; font-size: 20px;">${advisory.title}</h2>
            </div>
            
            <div style="margin-bottom: 20px;">
              <span style="background: ${advisory.severity === 'Critical' ? '#dc3545' : advisory.severity === 'High' ? '#fd7e14' : advisory.severity === 'Medium' ? '#ffc107' : '#28a745'}; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${advisory.severity ? advisory.severity.toUpperCase() : 'UNKNOWN'}
              </span>
              ${advisory.cvss ? `<span style="margin-left: 10px; background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">CVSS: ${advisory.cvss}</span>` : ''}
            </div>
            
            ${advisory.summary ? `
            <div style="margin-bottom: 25px; background: #e3f2fd; padding: 15px; border-radius: 4px; border-left: 4px solid #2196f3;">
              <h3 style="color: #1976d2; margin: 0 0 10px 0; font-size: 16px;">Summary</h3>
              <p style="color: #333; line-height: 1.6; margin: 0;">${advisory.summary}</p>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">Description</h3>
              <p style="color: #666; line-height: 1.6; margin: 0;">${advisory.description || 'No description available'}</p>
            </div>
            
            ${advisory.cveIds && advisory.cveIds.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">CVE IDs</h3>
              <div style="background: #fff3cd; padding: 10px; border-radius: 4px; border-left: 4px solid #ffc107;">
                ${advisory.cveIds.map(cve => `<span style="display: inline-block; margin: 2px; padding: 2px 8px; background: #856404; color: white; border-radius: 3px; font-size: 12px;">${cve}</span>`).join('')}
              </div>
            </div>
            ` : ''}
            
            ${advisory.content ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">Technical Analysis</h3>
              <div style="color: #666; line-height: 1.6; white-space: pre-wrap; background: #f8f9fa; padding: 15px; border-radius: 4px; font-size: 14px;">${advisory.content}</div>
            </div>
            ` : ''}
            
            ${advisory.iocs && advisory.iocs.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">Indicators of Compromise (IOCs)</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #dc3545;">
                ${advisory.iocs.map(ioc => `
                  <div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 3px; border: 1px solid #dee2e6;">
                    <div style="font-family: monospace; font-size: 13px; color: #dc3545; font-weight: bold;">${ioc.value}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;"><strong>Type:</strong> ${ioc.type} | <strong>Description:</strong> ${ioc.description}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
            
            ${advisory.references && advisory.references.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; margin-bottom: 10px;">References</h3>
              <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
                ${advisory.references.map(ref => `<li><a href="${ref}" style="color: #007bff; text-decoration: none;">${ref}</a></li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 12px;">
              <p><strong>Category:</strong> ${advisory.category || 'Unknown'}</p>
              <p><strong>Published:</strong> ${advisory.publishedDate ? new Date(advisory.publishedDate).toLocaleDateString() : 'Unknown'}</p>
              <p><strong>Author:</strong> ${advisory.author || 'Unknown'}</p>
              ${advisory.tags && advisory.tags.length > 0 ? `<p><strong>Tags:</strong> ${advisory.tags.join(', ')}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">This is an automated threat advisory from EaglEye IntelDesk Intelligence Platform</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Fallback if no advisory found and no custom message
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #dc3545; margin: 0; font-size: 24px;">ðŸš¨ THREAT ADVISORY</h1>
            <p>This is a scheduled threat advisory notification.</p>
            <p><strong>Advisory ID:</strong> ${emailDoc.advisoryId}</p>
            <p><em>Advisory details could not be loaded at this time.</em></p>
          </div>
        </div>
      `;
      console.log('Using fallback email content');
    }
    
    // Convert to the format expected by sendEmail
    const emailData = {
      to: emailDoc.to.join(', '), // Convert array to string
      subject: emailDoc.subject,
      body: emailBody
    };
    
    console.log(`Sending email with ${emailBody.length} characters of content`);
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

// New enhanced advisory email job
agenda.define('send-scheduled-advisory-email', async (job, done) => {
  const { emailId } = job.attrs.data;
  
  try {
    console.log(`Processing enhanced advisory email job for email ID: ${emailId}`);
    
    const emailDoc = await ScheduledEmail.findById(emailId);
    
    if (!emailDoc) {
      console.error(`Email document not found for ID: ${emailId}`);
      return done(new Error('Email document not found'));
    }

    if (emailDoc.status === 'sent') {
      console.log(`Email ${emailId} already sent, skipping`);
      return done();
    }

    // Get advisory details from Eagle Nest
    let advisory;
    
    // Eagle Nest advisory - load from JSON file
    console.log(`📋 Eagle Nest advisory detected in Agenda job: ${emailDoc.advisoryId}`);
      const fs = require('fs');
      const path = require('path');
      const eagleNestPath = path.resolve(process.cwd(), 'backend', 'workspace', 'eagle_nest', `${emailDoc.advisoryId}.json`);
      
      if (!fs.existsSync(eagleNestPath)) {
        console.error(`Eagle Nest advisory not found: ${emailDoc.advisoryId}`);
        return done(new Error('Eagle Nest advisory not found'));
      }
      
      try {
        const eagleNestData = JSON.parse(fs.readFileSync(eagleNestPath, 'utf8'));
        
        // Check if HTML file exists in backend/workspace/ or backend/workspace/email_cache/
        let htmlFileName = null;
        const workspacePath = path.resolve(process.cwd(), 'backend', 'workspace');
        const emailCachePath = path.resolve(process.cwd(), 'backend', 'workspace', 'email_cache');
        
        // Search in workspace root first
        let htmlFiles = fs.readdirSync(workspacePath).filter(f => f.startsWith(emailDoc.advisoryId) && f.endsWith('.html'));
        
        if (htmlFiles.length === 0 && fs.existsSync(emailCachePath)) {
          // Search in email_cache folder
          htmlFiles = fs.readdirSync(emailCachePath).filter(f => f.startsWith(emailDoc.advisoryId) && f.endsWith('.html'));
          if (htmlFiles.length > 0) {
            htmlFileName = `email_cache/${htmlFiles[0]}`; // Include subfolder path
            console.log(`📧 Found Eagle Nest HTML file in cache: ${htmlFileName}`);
          }
        } else if (htmlFiles.length > 0) {
          htmlFileName = htmlFiles[0]; // Use the first matching HTML file
          console.log(`📧 Found Eagle Nest HTML file: ${htmlFileName}`);
        }
        
        // Use raw Eagle Nest data - template generator handles all field name variations
        advisory = {
          ...eagleNestData, // Spread all original fields
          _id: emailDoc.advisoryId, // Ensure _id is set
          htmlFileName: htmlFileName // Add HTML filename if found
        };
      } catch (err) {
        console.error('Error parsing Eagle Nest advisory:', err);
        return done(new Error('Failed to load Eagle Nest advisory'));
      }

    // Generate email body using advisory template
    let emailBody;
    
    // Check if HTML file exists for this advisory
    if (advisory.htmlFileName) {
      console.log(`📧 Attempting to use workspace HTML file: ${advisory.htmlFileName}`);
      try {
        const workspacePath = path.resolve(process.cwd(), 'backend', 'workspace', advisory.htmlFileName);
        const workspaceRoot = path.resolve(process.cwd(), 'backend', 'workspace');
        
        if (workspacePath.startsWith(workspaceRoot) && fs.existsSync(workspacePath)) {
          emailBody = fs.readFileSync(workspacePath, 'utf8');
          
          // Inject custom message if provided
          if (emailDoc.customMessage) {
            const customMessageHTML = `
              <tr>
                <td style="padding: 20px 30px; background-color: rgba(5, 150, 105, 0.8);">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #ffffff;">📢 Message from Security Team</h3>
                  <p style="margin: 0; font-size: 14px; color: #ecfdf5; line-height: 1.5;">${emailDoc.customMessage.replace(/\n/g, '<br>')}</p>
                </td>
              </tr>
            `;
            emailBody = emailBody.replace(/(<\/tr>)/, `$1${customMessageHTML}`);
          }
          
          console.log(`Using workspace HTML file for email body`);
        } else {
          console.log(`⚠️ Workspace HTML file not found, using advisory_4 template`);
          emailBody = generateAdvisory4EmailTemplate(advisory, emailDoc.customMessage || '');
        }
      } catch (err) {
        console.log(`⚠️ Error reading workspace HTML file, using advisory_4 template:`, err.message);
        emailBody = generateAdvisory4EmailTemplate(advisory, emailDoc.customMessage || '');
      }
    } else {
      console.log(`📧 Using advisory_4 template for email body`);
      emailBody = generateAdvisory4EmailTemplate(advisory, emailDoc.customMessage || '');
    }

    // Generate and send email
    const nodemailer = require('nodemailer');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    // Generate tracking ID if not exists
    if (!emailDoc.trackingId) {
      emailDoc.trackingId = crypto.randomBytes(32).toString('hex');
      await emailDoc.save();
      console.log(`📍 Generated tracking ID: ${emailDoc.trackingId}`);
    } else {
      console.log(`📍 Using existing tracking ID: ${emailDoc.trackingId}`);
    }

    // Inject tracking pixel into email body
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be set for email tracking');
    }
    const trackingPixelUrl = `${baseUrl}/api/track-email/${emailDoc.trackingId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;" alt="" />`;
    
    console.log(` Tracking pixel URL: ${trackingPixelUrl}`);
    
    // Insert tracking pixel just before closing body tag
    let trackedEmailBody = emailBody;
    if (emailBody.includes('</body>')) {
      trackedEmailBody = emailBody.replace('</body>', `${trackingPixel}</body>`);
      console.log(`Tracking pixel injected before </body> tag`);
    } else {
      // If no body tag, append at the end
      trackedEmailBody = emailBody + trackingPixel;
      console.log(`Tracking pixel appended to end of email`);
    }

    // Send email individually to each recipient
    const recipients = Array.isArray(emailDoc.to) ? emailDoc.to : [emailDoc.to];
    for (const recipient of recipients) {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: emailDoc.subject,
        html: trackedEmailBody
      };
      // No CC or BCC for individual delivery
      console.log(`📧 Sending email with advisory_4 template format:`, {
        to: mailOptions.to,
        subject: mailOptions.subject,
        advisory: advisory.title || advisory._id,
        bodyLength: emailBody.length,
        hasHTMLContent: emailBody.includes('<html>'),
        templateUsed: advisory.htmlFileName ? 'workspace HTML' : 'advisory_4 template'
      });
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully with advisory_4 format! Message ID: ${info.messageId}`);
    }
    // Update email status after all sends
    emailDoc.status = 'sent';
    emailDoc.sentAt = new Date();
    await emailDoc.save();
    done();
  } catch (err) {
    console.error('Failed to send enhanced advisory email:', err);
    
    try {
      const emailDoc = await ScheduledEmail.findById(emailId);
      if (emailDoc) {
        emailDoc.status = 'failed';
        emailDoc.errorMessage = err.message;
        await emailDoc.save();
      }
    } catch (updateErr) {
      console.error('Failed to update email status:', updateErr);
    }
    
    done(err);
  }
});

// Helper function to generate advisory email body with mobile-optimized template
function generateAdvisoryEmailBody(advisory, customMessage = '') {
  // First, try to read the workspace HTML file if available
  if (advisory.htmlFileName) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const workspacePath = path.resolve(process.cwd(), 'backend', 'workspace', advisory.htmlFileName);
      const workspaceRoot = path.resolve(process.cwd(), 'backend', 'workspace');
      
      // Security check
      if (workspacePath.startsWith(workspaceRoot) && fs.existsSync(workspacePath)) {
        console.log(`📧 Reading workspace HTML file: ${advisory.htmlFileName}`);
        let htmlContent = fs.readFileSync(workspacePath, 'utf8');
        
        // If custom message is provided, inject it into the HTML
        if (customMessage) {
          const customMessageHTML = `
            <tr>
              <td style="padding: 20px 30px; background-color: rgba(5, 150, 105, 0.8);">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #ffffff;">📢 Message from Security Team</h3>
                <p style="margin: 0; font-size: 14px; color: #ecfdf5; line-height: 1.5;">${customMessage.replace(/\n/g, '<br>')}</p>
              </td>
            </tr>
          `;
          htmlContent = htmlContent.replace(/(<\/tr>)/, `$1${customMessageHTML}`);
        }
        
        console.log(`Successfully loaded workspace HTML file`);
        return htmlContent;
      } else {
        console.log(`⚠️ Workspace HTML file not found or invalid path: ${advisory.htmlFileName}`);
      }
    } catch (error) {
      console.error('Error reading workspace HTML file:', error);
    }
  }
  
  // Fallback to dashboard-style template generator
  console.log('📧 Using generated email template');
  const { generateDashboardStyleEmailTemplate } = require('./emailTemplateGenerator');
  
  try {
    return generateDashboardStyleEmailTemplate(advisory, customMessage);
  } catch (error) {
    console.error('Error generating email template:', error);
    // Fallback to basic template if import fails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Advisory: ${advisory.title || 'Untitled'}</title>
</head>
<body style="font-family: Arial, sans-serif; background: #1f2937; color: #ffffff; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #374151; border-radius: 8px; padding: 30px;">
        <h1 style="color: #60a5fa; text-align: center;">ðŸ›¡ï¸ THREAT ADVISORY</h1>
        <h2 style="color: #ffffff;">${advisory.title || 'Untitled Advisory'}</h2>
        ${customMessage ? `<div style="background: #059669; padding: 15px; border-radius: 6px; margin: 20px 0;"><strong>Message:</strong> ${customMessage}</div>` : ''}
        <p style="color: #e5e7eb;">${advisory.executiveSummary || advisory.summary || advisory.description || 'No description available'}</p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}/advisory/${advisory._id}" style="background: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">ðŸ“„ View Full Report</a>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #6b7280; text-align: center; color: #9ca3af; font-size: 12px;">
            ðŸ¦… EaglEye IntelDesk | Threat Intelligence Platform
        </div>
    </div>
</body>
</html>`;
  }
}

// Agenda event handlers
agenda.on('fail', (err, job) => {
  console.error('Agenda job failed:', job.attrs, err);
});

agenda.on('ready', () => {
  console.log('Agenda started and ready');
});

// Function to start agenda
async function startAgenda() {
  if (!started) {
    await agenda.start();
    started = true;
    console.log('Agenda worker started');
  }
  return agenda;
}

module.exports = { agenda, startAgenda };