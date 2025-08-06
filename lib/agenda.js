// agenda.js
const Agenda = require('agenda');
const mongoose = require('mongoose');
const { sendEmail } = require('./emailSender');

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
  retryCount: { type: Number, default: 0 }
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

const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory', collection: 'agendaJobs' },
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
    
    // Manually fetch the advisory details
    const advisory = await Advisory.findById(emailDoc.advisoryId);
    if (!advisory) {
      console.log(`Warning: Advisory ${emailDoc.advisoryId} not found, using custom message only`);
    } else {
      console.log(`✅ Advisory found: ${advisory.title}`);
      console.log(`📊 Advisory has: summary=${!!advisory.summary}, content=${!!advisory.content}, cvss=${!!advisory.cvss}, iocs=${advisory.iocs ? advisory.iocs.length : 0}`);
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
              <h1 style="color: #dc3545; margin: 0; font-size: 24px;">🚨 THREAT ADVISORY</h1>
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
              <h3 style="color: #333; margin-bottom: 10px;">Detailed Analysis</h3>
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
            <h1 style="color: #dc3545; margin: 0; font-size: 24px;">🚨 THREAT ADVISORY</h1>
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

    // Get advisory details
    const advisory = await Advisory.findById(emailDoc.advisoryId);
    if (!advisory) {
      console.error(`Advisory not found for email ${emailId}`);
      return done(new Error('Advisory not found'));
    }

    const emailBody = generateAdvisoryEmailBody(advisory, emailDoc.customMessage);

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
      }
    });

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: emailDoc.to.join(', '),
      cc: emailDoc.cc?.length ? emailDoc.cc.join(', ') : undefined,
      bcc: emailDoc.bcc?.length ? emailDoc.bcc.join(', ') : undefined,
      subject: emailDoc.subject,
      html: emailBody
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Enhanced advisory email sent successfully:`, info.messageId);

    // Update email status
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

// Helper function to generate advisory email body
function generateAdvisoryEmailBody(advisory, customMessage = '') {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Build custom message section
  const customMessageSection = customMessage ? 
    '<div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin-bottom: 20px;">' +
    '<strong>Message from Security Team:</strong>' +
    '<p>' + customMessage.replace(/\n/g, '<br>') + '</p>' +
    '</div>' : '';

  // Build comprehensive content sections - only if data exists and is not empty
  const contentSection = (advisory.content && String(advisory.content).trim()) ? 
    '<div class="section">' +
    '<h3>Advisory Content</h3>' +
    '<div style="white-space: pre-wrap; line-height: 1.6; background: #f8f9fa; padding: 15px; border-radius: 4px;">' + String(advisory.content).trim() + '</div>' +
    '</div>' : '';

  const descriptionSection = (advisory.description && String(advisory.description).trim()) ? 
    '<div class="section">' +
    '<h3>Description</h3>' +
    '<p>' + String(advisory.description).trim() + '</p>' +
    '</div>' : '';

  const summarySection = (advisory.summary && String(advisory.summary).trim()) ? 
    '<div class="section">' +
    '<h3>Summary</h3>' +
    '<p>' + String(advisory.summary).trim() + '</p>' +
    '</div>' : '';

  const executiveSummarySection = (advisory.executiveSummary && String(advisory.executiveSummary).trim()) ? 
    '<div class="section">' +
    '<h3>Executive Summary</h3>' +
    '<p>' + String(advisory.executiveSummary).trim() + '</p>' +
    '</div>' : '';

  // Build CVE section - only if arrays have content
  const cveSection = ((advisory.cveIds?.length || advisory.cves?.length)) ?
    '<div class="section">' +
    '<h3>CVE Identifiers</h3>' +
    '<div class="cve-list">' +
    (advisory.cveIds || advisory.cves || []).filter(cve => cve && cve.trim()).map(cve => '<span class="cve-item">' + cve.trim() + '</span>').join('') +
    '</div>' +
    '</div>' : '';

  // Build IOCs section - only if array has content
  const iocsSection = (advisory.iocs?.length && advisory.iocs.some(ioc => ioc && ioc.value && ioc.value.trim())) ?
    '<div class="section">' +
    '<h3>Indicators of Compromise (IOCs)</h3>' +
    '<div style="background: #fef2f2; padding: 12px; border-radius: 4px; border-left: 4px solid #dc2626;">' +
    advisory.iocs.filter(ioc => ioc && ioc.value && ioc.value.trim()).map(ioc => 
      '<div style="margin: 8px 0; padding: 8px; background: white; border-radius: 3px; border: 1px solid #fee2e2;">' +
      '<div style="font-family: monospace; font-weight: bold; color: #dc2626;">' + ioc.value.trim() + '</div>' +
      '<div style="font-size: 12px; color: #666; margin-top: 2px;">' +
      '<strong>Type:</strong> ' + (ioc.type || 'Unknown') + ' | <strong>Description:</strong> ' + (ioc.description?.trim() || 'N/A') +
      '</div>' +
      '</div>'
    ).join('') +
    '</div>' +
    '</div>' : '';

  // Build affected products section - only if array has content
  const productsSection = (advisory.affectedProducts?.length && advisory.affectedProducts.some(product => product && product.trim())) ?
    '<div class="section">' +
    '<h3>Affected Products</h3>' +
    '<ul>' +
    advisory.affectedProducts.filter(product => product && product.trim()).map(product => '<li>' + product.trim() + '</li>').join('') +
    '</ul>' +
    '</div>' : '';

  // Build affected systems section - only if array has content
  const systemsSection = (advisory.affected_systems?.length && advisory.affected_systems.some(system => system && system.trim())) ?
    '<div class="section">' +
    '<h3>Affected Systems</h3>' +
    '<ul>' +
    advisory.affected_systems.filter(system => system && system.trim()).map(system => '<li>' + system.trim() + '</li>').join('') +
    '</ul>' +
    '</div>' : '';

  // Build threat types section - only if array has content
  const threatTypesSection = (advisory.threat_type?.length && advisory.threat_type.some(type => type && type.trim())) ?
    '<div class="section">' +
    '<h3>Threat Types</h3>' +
    '<div style="background: #fef3c7; padding: 10px; border-radius: 4px;">' +
    advisory.threat_type.filter(type => type && type.trim()).map(type => '<span style="display: inline-block; background: #92400e; color: white; padding: 2px 8px; margin: 2px; border-radius: 3px; font-size: 12px;">' + type.trim() + '</span>').join('') +
    '</div>' +
    '</div>' : '';

  // Build target sectors section - only if array has content
  const sectorsSection = (advisory.targetSectors?.length && advisory.targetSectors.some(sector => sector && sector.trim())) ?
    '<div class="section">' +
    '<h3>Target Sectors</h3>' +
    '<ul>' +
    advisory.targetSectors.filter(sector => sector && sector.trim()).map(sector => '<li>' + sector.trim() + '</li>').join('') +
    '</ul>' +
    '</div>' : '';

  // Build regions section - only if array has content
  const regionsSection = (advisory.regions?.length && advisory.regions.some(region => region && region.trim())) ?
    '<div class="section">' +
    '<h3>Affected Regions</h3>' +
    '<ul>' +
    advisory.regions.filter(region => region && region.trim()).map(region => '<li>' + region.trim() + '</li>').join('') +
    '</ul>' +
    '</div>' : '';

  // Build MITRE tactics section - only if array has valid objects
  const mitreSection = (advisory.mitreTactics?.length && advisory.mitreTactics.some(tactic => tactic && (tactic.tacticName || tactic.technique))) ?
    '<div class="section">' +
    '<h3>MITRE ATT&CK Tactics</h3>' +
    '<div style="background: #f3f4f6; padding: 12px; border-radius: 4px;">' +
    advisory.mitreTactics.filter(tactic => tactic && (tactic.tacticName || tactic.technique)).map(tactic => 
      '<div style="margin: 5px 0; padding: 8px; background: white; border-radius: 3px; border-left: 3px solid #374151;">' +
      '<strong>' + (tactic.tacticName || 'Unknown Tactic') + '</strong>' + (tactic.techniqueId ? ' (' + tactic.techniqueId + ')' : '') +
      '<br><span style="font-size: 14px; color: #666;">' + (tactic.technique || 'No description') + '</span>' +
      '</div>'
    ).join('') +
    '</div>' +
    '</div>' : '';

  // Build recommendations section - only if array has content
  const recommendationsSection = (advisory.recommendations?.length && advisory.recommendations.some(rec => rec && rec.trim())) ?
    '<div class="section">' +
    '<h3>Recommendations</h3>' +
    '<ul>' +
    advisory.recommendations.filter(rec => rec && rec.trim()).map(rec => '<li>' + rec.trim() + '</li>').join('') +
    '</ul>' +
    '</div>' : '';

  // Build patch details section - only if data exists and has content
  const patchSection = (advisory.patchDetails && String(advisory.patchDetails).trim()) ? 
    '<div class="section">' +
    '<h3>Patch Details</h3>' +
    '<div style="background: #f0fdf4; padding: 12px; border-radius: 4px; border-left: 4px solid #16a34a;">' +
    '<p>' + String(advisory.patchDetails).trim() + '</p>' +
    '</div>' +
    '</div>' : '';

  // Build references section - only if array has valid URLs
  const referencesSection = (advisory.references?.length && advisory.references.some(ref => ref && ref.trim())) ?
    '<div class="section">' +
    '<h3>References</h3>' +
    '<ul>' +
    advisory.references.filter(ref => ref && ref.trim()).map(ref => '<li><a href="' + ref.trim() + '" style="color: #2563eb; text-decoration: none;">' + ref.trim() + '</a></li>').join('') +
    '</ul>' +
    '</div>' : '';

  // Build tags section - only if array has content
  const tagsSection = (advisory.tags?.length && advisory.tags.some(tag => tag && tag.trim())) ?
    '<div class="section">' +
    '<h3>Tags</h3>' +
    '<div style="background: #f3f4f6; padding: 10px; border-radius: 4px;">' +
    advisory.tags.filter(tag => tag && tag.trim()).map(tag => '<span style="display: inline-block; background: #6b7280; color: white; padding: 2px 8px; margin: 2px; border-radius: 3px; font-size: 12px;">' + tag.trim() + '</span>').join('') +
    '</div>' +
    '</div>' : '';

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Threat Advisory: ${advisory.title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .severity { 
            display: inline-block; 
            padding: 6px 12px; 
            border-radius: 4px; 
            color: white; 
            font-weight: bold; 
            font-size: 12px;
        }
        .critical { background: #dc2626; }
        .high { background: #ea580c; }
        .medium { background: #ca8a04; }
        .low { background: #2563eb; }
        .section { margin: 25px 0; }
        .cve-list { background: #f3f4f6; padding: 12px; border-radius: 4px; margin: 10px 0; }
        .cve-item { display: inline-block; background: #374151; color: white; padding: 4px 8px; margin: 2px; border-radius: 3px; font-size: 12px; }
        .footer { background: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        .info-item { background: #f8f9fa; padding: 8px; border-radius: 4px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 THREAT ADVISORY</h1>
        <h2>${advisory.title}</h2>
    </div>
    
    <div class="content">
        ${customMessageSection}
        
        <div class="section">
            <div class="info-grid">
                <div class="info-item"><strong>Severity:</strong> 
                    <span class="severity ${advisory.severity?.toLowerCase() || 'low'}">
                        ${advisory.severity?.toUpperCase() || 'UNKNOWN'}
                    </span>
                </div>
                ${(advisory.category && String(advisory.category).trim()) ? '<div class="info-item"><strong>Category:</strong> ' + String(advisory.category).trim() + '</div>' : ''}
                ${advisory.publishedDate ? '<div class="info-item"><strong>Published:</strong> ' + new Date(advisory.publishedDate).toLocaleDateString() + '</div>' : ''}
                ${(advisory.author && String(advisory.author).trim()) ? '<div class="info-item"><strong>Author:</strong> ' + String(advisory.author).trim() + '</div>' : ''}
                ${(advisory.cvss && String(advisory.cvss).trim()) ? '<div class="info-item"><strong>CVSS Score:</strong> ' + String(advisory.cvss).trim() + '</div>' : ''}
                ${(advisory.threatDesignation && String(advisory.threatDesignation).trim()) ? '<div class="info-item"><strong>Threat Designation:</strong> ' + String(advisory.threatDesignation).trim() + '</div>' : ''}
                ${(advisory.threatCategory && String(advisory.threatCategory).trim()) ? '<div class="info-item"><strong>Threat Category:</strong> ' + String(advisory.threatCategory).trim() + '</div>' : ''}
                ${(advisory.threatLevel && String(advisory.threatLevel).trim()) ? '<div class="info-item"><strong>Threat Level:</strong> ' + String(advisory.threatLevel).trim() + '</div>' : ''}
                ${((advisory.tlpClassification && String(advisory.tlpClassification).trim()) || (advisory.tlp && String(advisory.tlp).trim())) ? '<div class="info-item"><strong>TLP Classification:</strong> ' + ((advisory.tlpClassification && String(advisory.tlpClassification).trim()) || (advisory.tlp && String(advisory.tlp).trim())) + '</div>' : ''}
            </div>
        </div>

        ${executiveSummarySection}
        ${summarySection}
        ${contentSection}
        ${descriptionSection}
        ${cveSection}
        ${iocsSection}
        ${productsSection}
        ${systemsSection}
        ${threatTypesSection}
        ${sectorsSection}
        ${regionsSection}
        ${mitreSection}
        ${recommendationsSection}
        ${patchSection}
        ${referencesSection}
        ${tagsSection}
        
        <div style="margin-top: 30px; padding: 15px; background: #f0f9ff; border-radius: 4px; text-align: center;">
            <p><strong>View full advisory details:</strong></p>
            <p><a href="${baseUrl}/advisory/${advisory._id}" style="color: #2563eb; text-decoration: none; font-weight: bold;">
                ${baseUrl}/advisory/${advisory._id}
            </a></p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>EaglEye IntelDesk - Threat Intelligence Platform</strong></p>
        <p>Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
        <p>This is an automated security advisory. Please do not reply to this email.</p>
    </div>
</body>
</html>`;
}

agenda.on('fail', (err, job) => {
  console.error('Agenda job failed:', job.attrs, err);
});

agenda.on('ready', () => {
  console.log('Agenda started and ready');
});

async function startAgenda() {
  if (!started) {
    await agenda.start();
    started = true;
    console.log('Agenda worker started');
  }
  return agenda;
}

module.exports = { agenda, startAgenda };
