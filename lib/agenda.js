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
  
  // Build sections only if data exists
  const buildSection = (title, content, sectionClass = '', headerStyle = '') => content ? `
    <tr>
      <td style="padding: 20px 0 10px 0;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="background: #f8fafc; padding: 12px 20px; border-left: 4px solid #3b82f6; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #1e40af; font-size: 16px; font-weight: bold; ${headerStyle}">${title}</h3>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 20px; background: #ffffff; border: 1px solid #e2e8f0; ${sectionClass}">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Custom message section
  const customMessageSection = customMessage ? buildSection(
    '📢 Message from Security Team',
    `<p style="margin: 0; line-height: 1.6; color: #374151;">${customMessage.replace(/\n/g, '<br>')}</p>`,
    'border-left: 4px solid #10b981;'
  ) : '';

  // Basic Threat Parameters
  const basicParamsContent = (() => {
    const params = [];
    if (advisory.severity) params.push(`<strong>Severity:</strong> <span style="padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; background: ${advisory.severity === 'Critical' ? '#dc2626' : advisory.severity === 'High' ? '#ea580c' : advisory.severity === 'Medium' ? '#ca8a04' : '#16a34a'};">${advisory.severity.toUpperCase()}</span>`);
    if (advisory.category && String(advisory.category).trim()) params.push(`<strong>Category:</strong> ${String(advisory.category).trim()}`);
    if (advisory.cvss && String(advisory.cvss).trim()) params.push(`<strong>CVSS Score:</strong> ${String(advisory.cvss).trim()}`);
    if (advisory.threatLevel && String(advisory.threatLevel).trim()) params.push(`<strong>Threat Level:</strong> ${String(advisory.threatLevel).trim()}`);
    if (advisory.publishedDate) params.push(`<strong>Published:</strong> ${new Date(advisory.publishedDate).toLocaleDateString()}`);
    if (advisory.author && String(advisory.author).trim()) params.push(`<strong>Author:</strong> ${String(advisory.author).trim()}`);
    return params.length ? `<table cellpadding="0" cellspacing="0" border="0" width="100%">${params.map(param => `<tr><td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #374151;">${param}</td></tr>`).join('')}</table>` : '';
  })();

  const basicParamsSection = basicParamsContent ? buildSection('📊 Basic Threat Parameters', basicParamsContent) : '';

  // Threat Details - Only show Executive Summary (prioritized)
  const threatDetailsContent = (() => {
    let content = '';
    
    // Priority order: executiveSummary > summary > description
    if (advisory.executiveSummary && String(advisory.executiveSummary).trim()) {
      content = `<div><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Executive Summary</h4><p style="margin: 0; line-height: 1.6; color: #374151;">${String(advisory.executiveSummary).trim()}</p></div>`;
    } else if (advisory.summary && String(advisory.summary).trim()) {
      content = `<div><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Executive Summary</h4><p style="margin: 0; line-height: 1.6; color: #374151;">${String(advisory.summary).trim()}</p></div>`;
    } else if (advisory.description && String(advisory.description).trim()) {
      content = `<div><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Executive Summary</h4><p style="margin: 0; line-height: 1.6; color: #374151;">${String(advisory.description).trim()}</p></div>`;
    }
    
    return content;
  })();

  const threatDetailsSection = threatDetailsContent ? buildSection('🎯 Threat Details', threatDetailsContent) : '';

  // CVE Identifiers
  const cveContent = ((advisory.cveIds?.length || advisory.cves?.length)) ? 
    `<div>${(advisory.cveIds || advisory.cves || []).filter(cve => cve && cve.trim()).map(cve => 
      `<span style="display: inline-block; background: #dc2626; color: white; padding: 4px 8px; margin: 2px 4px 2px 0; border-radius: 4px; font-size: 12px; font-weight: bold;">${cve.trim()}</span>`
    ).join('')}</div>` : '';

  const cveSection = cveContent ? buildSection('🔍 CVE Identifiers', cveContent) : '';

  // Indicators of Compromise
  const iocsContent = (advisory.iocs?.length && advisory.iocs.some(ioc => ioc && ioc.value && ioc.value.trim())) ?
    `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
      <tr style="background: #fef2f2;">
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #fecaca; font-size: 12px; font-weight: bold; color: #991b1b;">Indicator</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #fecaca; font-size: 12px; font-weight: bold; color: #991b1b;">Type</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #fecaca; font-size: 12px; font-weight: bold; color: #991b1b;">Description</th>
      </tr>
      ${advisory.iocs.filter(ioc => ioc && ioc.value && ioc.value.trim()).map(ioc => 
        `<tr>
          <td style="padding: 8px 12px; border: 1px solid #fecaca; font-family: monospace; font-size: 12px; color: #dc2626; font-weight: bold;">${ioc.value.trim()}</td>
          <td style="padding: 8px 12px; border: 1px solid #fecaca; font-size: 12px; color: #374151;">${ioc.type || 'Unknown'}</td>
          <td style="padding: 8px 12px; border: 1px solid #fecaca; font-size: 12px; color: #374151;">${ioc.description?.trim() || 'N/A'}</td>
        </tr>`
      ).join('')}
    </table>` : '';

  const iocsSection = iocsContent ? buildSection('⚠️ Indicators of Compromise', iocsContent) : '';

  // MITRE ATT&CK Framework
  const mitreContent = (advisory.mitreTactics?.length && advisory.mitreTactics.some(tactic => tactic && (tactic.tacticName || tactic.technique))) ?
    `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
      <tr style="background: #f1f5f9;">
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #334155;">Tactic</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #334155;">Technique ID</th>
        <th style="padding: 8px 12px; text-align: left; border: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; color: #334155;">Technique</th>
      </tr>
      ${advisory.mitreTactics.filter(tactic => tactic && (tactic.tacticName || tactic.technique)).map(tactic => 
        `<tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; color: #374151; font-weight: bold;">${tactic.tacticName || 'Unknown'}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; color: #374151; font-family: monospace;">${tactic.techniqueId || 'N/A'}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 12px; color: #374151;">${tactic.technique || 'No description'}</td>
        </tr>`
      ).join('')}
    </table>` : '';

  const mitreSection = mitreContent ? buildSection('🎭 MITRE ATT&CK Framework', mitreContent) : '';

  // Recommendations
  const recommendationsContent = (advisory.recommendations?.length && advisory.recommendations.some(rec => rec && rec.trim())) ?
    `<ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.6;">
      ${advisory.recommendations.filter(rec => rec && rec.trim()).map(rec => `<li style="margin-bottom: 6px;">${rec.trim()}</li>`).join('')}
    </ul>` : '';

  const recommendationsSection = recommendationsContent ? buildSection('✅ Recommendations', recommendationsContent, 'border-left: 4px solid #10b981;') : '';

  // Patch Details
  const patchContent = (advisory.patchDetails && String(advisory.patchDetails).trim()) ?
    `<div style="background: #f0fdf4; padding: 12px; border-radius: 4px; border-left: 4px solid #16a34a;">
      <p style="margin: 0; line-height: 1.6; color: #15803d; font-weight: 500;">${String(advisory.patchDetails).trim()}</p>
    </div>` : '';

  const patchSection = patchContent ? buildSection('🔧 Patch Details', patchContent) : '';

  // Metadata & References
  const metadataContent = (() => {
    let content = '';
    
    // Additional metadata
    const metadata = [];
    if (advisory.threatDesignation && String(advisory.threatDesignation).trim()) metadata.push(`<strong>Threat Designation:</strong> ${String(advisory.threatDesignation).trim()}`);
    if (advisory.threatCategory && String(advisory.threatCategory).trim()) metadata.push(`<strong>Threat Category:</strong> ${String(advisory.threatCategory).trim()}`);
    if ((advisory.tlpClassification && String(advisory.tlpClassification).trim()) || (advisory.tlp && String(advisory.tlp).trim())) metadata.push(`<strong>TLP Classification:</strong> ${(advisory.tlpClassification && String(advisory.tlpClassification).trim()) || (advisory.tlp && String(advisory.tlp).trim())}`);
    
    if (metadata.length) {
      content += `<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Additional Metadata</h4><table cellpadding="0" cellspacing="0" border="0" width="100%">${metadata.map(item => `<tr><td style="padding: 4px 0; color: #374151; font-size: 13px;">${item}</td></tr>`).join('')}</table></div>`;
    }

    // References
    if (advisory.references?.length && advisory.references.some(ref => ref && ref.trim())) {
      content += `<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">External References</h4><ul style="margin: 0; padding-left: 20px;">${advisory.references.filter(ref => ref && ref.trim()).map(ref => `<li style="margin-bottom: 4px;"><a href="${ref.trim()}" style="color: #2563eb; text-decoration: none;">${ref.trim()}</a></li>`).join('')}</ul></div>`;
    }

    // Tags
    if (advisory.tags?.length && advisory.tags.some(tag => tag && tag.trim())) {
      content += `<div><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Tags</h4><div>${advisory.tags.filter(tag => tag && tag.trim()).map(tag => `<span style="display: inline-block; background: #6b7280; color: white; padding: 2px 8px; margin: 2px 4px 2px 0; border-radius: 3px; font-size: 11px;">${tag.trim()}</span>`).join('')}</div></div>`;
    }

    // Advisory ID and creation date
    content += `<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;"><p style="margin: 0; font-size: 12px; color: #6b7280;"><strong>Advisory ID:</strong> ${advisory._id || 'N/A'}<br><strong>Generated:</strong> ${new Date().toLocaleString()}</p></div>`;

    return content;
  })();

  const metadataSection = metadataContent ? buildSection('📋 Metadata & References', metadataContent) : '';

  // Affected Systems/Products
  const affectedContent = (() => {
    let content = '';
    if (advisory.affectedProducts?.length && advisory.affectedProducts.some(product => product && product.trim())) {
      content += `<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Affected Products</h4><ul style="margin: 0; padding-left: 20px;">${advisory.affectedProducts.filter(product => product && product.trim()).map(product => `<li style="margin-bottom: 4px; color: #374151;">${product.trim()}</li>`).join('')}</ul></div>`;
    }
    if (advisory.affected_systems?.length && advisory.affected_systems.some(system => system && system.trim())) {
      content += `<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Affected Systems</h4><ul style="margin: 0; padding-left: 20px;">${advisory.affected_systems.filter(system => system && system.trim()).map(system => `<li style="margin-bottom: 4px; color: #374151;">${system.trim()}</li>`).join('')}</ul></div>`;
    }
    if (advisory.targetSectors?.length && advisory.targetSectors.some(sector => sector && sector.trim())) {
      content += `<div style="margin-bottom: 15px;"><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Target Sectors</h4><ul style="margin: 0; padding-left: 20px;">${advisory.targetSectors.filter(sector => sector && sector.trim()).map(sector => `<li style="margin-bottom: 4px; color: #374151;">${sector.trim()}</li>`).join('')}</ul></div>`;
    }
    if (advisory.regions?.length && advisory.regions.some(region => region && region.trim())) {
      content += `<div><h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Affected Regions</h4><ul style="margin: 0; padding-left: 20px;">${advisory.regions.filter(region => region && region.trim()).map(region => `<li style="margin-bottom: 4px; color: #374151;">${region.trim()}</li>`).join('')}</ul></div>`;
    }
    return content;
  })();

  const affectedSection = affectedContent ? buildSection('🌐 Affected Systems & Targets', affectedContent) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Advisory: ${advisory.title || 'Untitled'}</title>
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f1f5f9; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 700px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <img src="https://i.ibb.co/20vhMNrh/Eagleye-logo-1.png" alt="EaglEye Logo" style="height: 60px; margin-bottom: 15px;" />
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                      🚨 THREAT ADVISORY
                    </h1>
                    <h2 style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 18px; font-weight: 500; line-height: 1.4;">
                      ${advisory.title || 'Untitled Advisory'}
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                
                ${customMessageSection}
                ${basicParamsSection}
                ${threatDetailsSection}
                ${cveSection}
                ${iocsSection}
                ${mitreSection}
                ${affectedSection}
                ${recommendationsSection}
                ${patchSection}
                ${metadataSection}

                <!-- View Full Advisory -->
                <tr>
                  <td style="padding: 30px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; border: 1px solid #3b82f6;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">📱 View Complete Advisory</h3>
                          <p style="margin: 0 0 15px 0; color: #374151; font-size: 14px;">Access the full interactive advisory with all details and analysis</p>
                          <a href="${baseUrl}/advisory/${advisory._id}" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">
                            Open Full Advisory →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #374151; padding: 25px 20px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding-bottom: 10px;">
                    <img src="https://i.ibb.co/pv0VB82D/cybertech-logo.png" alt="CyberTech Logo" style="height: 40px;" />
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #ffffff; font-weight: bold; font-size: 16px;">EaglEye IntelDesk</p>
                    <p style="margin: 0 0 8px 0; color: #d1d5db; font-size: 14px;">Threat Intelligence Platform</p>
                    <p style="margin: 0 0 15px 0; color: #d1d5db; font-size: 13px;">Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; font-style: italic;">
                      This is an automated security advisory. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
