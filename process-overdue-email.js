// Process the overdue email directly using the Agenda system
require('dotenv').config();

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

// Email sender setup
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const processOverdueEmail = async () => {
  console.log('⚡ Processing overdue email directly...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory');
    console.log('✅ Connected to MongoDB');

    // Define schemas
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

    const AdvisorySchema = new mongoose.Schema({
      _id: mongoose.Schema.Types.ObjectId,
      title: { type: String, required: true },
      content: { type: String, required: true },
      summary: { type: String, required: true },
      severity: { type: String, required: true },
      cvss: { type: Number, default: 0 },
      cveIds: [{ type: String }],
      references: [{ type: String }],
      tags: [{ type: String }],
      iocs: [{
        type: { type: String },
        value: { type: String },
        description: { type: String }
      }],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { strict: false });

    const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
    const Advisory = mongoose.models.Advisory || mongoose.model('Advisory', AdvisorySchema);

    // Get the email
    const email = await ScheduledEmail.findById('688c56474e3f28c5d57b7599');
    
    if (!email) {
      console.log('❌ Email not found');
      process.exit(1);
    }
    
    console.log(`📧 Processing email: ${email.subject}`);
    
    // Get the advisory
    const advisory = await Advisory.findById(email.advisoryId);
    
    if (!advisory) {
      console.log('❌ Advisory not found');
      await ScheduledEmail.findByIdAndUpdate(email._id, {
        status: 'failed',
        errorMessage: 'Advisory not found',
        sentAt: new Date()
      });
      process.exit(1);
    }
    
    console.log(`📋 Found advisory: ${advisory.title}`);
    console.log(`📊 Advisory data length: ${JSON.stringify(advisory).length} characters`);

    // Generate rich email content
    const generateEmailBody = (advisory, customMessage) => {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .severity-high { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); }
            .severity-medium { background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%); }
            .severity-low { background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%); }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 25px; }
            .section h3 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; }
            .cve-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
            .cve-tag { background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .ioc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
            .ioc-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #e74c3c; }
            .ioc-type { font-weight: bold; color: #c0392b; text-transform: uppercase; font-size: 12px; }
            .ioc-value { font-family: 'Courier New', monospace; background: #ecf0f1; padding: 8px; border-radius: 4px; margin: 8px 0; word-break: break-all; }
            .references { background: white; padding: 20px; border-radius: 6px; margin-top: 15px; }
            .reference-link { display: block; color: #3498db; text-decoration: none; margin-bottom: 8px; }
            .reference-link:hover { text-decoration: underline; }
            .tags { margin-top: 15px; }
            .tag { background: #3498db; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px; display: inline-block; margin-bottom: 5px; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #34495e; color: white; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header severity-${advisory.severity?.toLowerCase() || 'medium'}">
              <h1>🚨 Threat Advisory Alert</h1>
              <h2>${advisory.title}</h2>
              <p><strong>Severity:</strong> ${(advisory.severity || 'Unknown').toUpperCase()}</p>
              ${advisory.cvss ? `<p><strong>CVSS Score:</strong> ${advisory.cvss}/10</p>` : ''}
            </div>
            
            <div class="content">
              ${customMessage ? `
                <div class="section">
                  <h3>📢 Custom Message</h3>
                  <p>${customMessage}</p>
                </div>
              ` : ''}
              
              <div class="section">
                <h3>📋 Executive Summary</h3>
                <p>${advisory.summary || 'No summary available.'}</p>
              </div>
              
              ${advisory.cveIds && advisory.cveIds.length > 0 ? `
                <div class="section">
                  <h3>🔍 CVE Identifiers</h3>
                  <div class="cve-list">
                    ${advisory.cveIds.map(cve => `<span class="cve-tag">${cve}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${advisory.iocs && advisory.iocs.length > 0 ? `
                <div class="section">
                  <h3>🎯 Indicators of Compromise (IOCs)</h3>
                  <div class="ioc-grid">
                    ${advisory.iocs.map(ioc => `
                      <div class="ioc-item">
                        <div class="ioc-type">${ioc.type || 'Unknown'}</div>
                        <div class="ioc-value">${ioc.value || 'N/A'}</div>
                        ${ioc.description ? `<div class="ioc-description">${ioc.description}</div>` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              <div class="section">
                <h3>📖 Technical Analysis</h3>
                <div style="background: white; padding: 20px; border-radius: 6px; line-height: 1.8;">
                  ${advisory.content || 'No technical analysis available.'}
                </div>
              </div>
              
              ${advisory.references && advisory.references.length > 0 ? `
                <div class="section">
                  <h3>🔗 References</h3>
                  <div class="references">
                    ${advisory.references.map(ref => `
                      <a href="${ref}" class="reference-link" target="_blank">${ref}</a>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              
              ${advisory.tags && advisory.tags.length > 0 ? `
                <div class="section">
                  <h3>🏷️ Tags</h3>
                  <div class="tags">
                    ${advisory.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p><strong>Forensic Cyber Technology</strong></p>
              <p>Stay vigilant. Stay secure.</p>
              <p style="font-size: 12px; margin-top: 15px;">
                This is an automated threat advisory. For questions, contact your security team.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    };

    const emailBody = generateEmailBody(advisory, email.customMessage);

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email.to.join(','),
      cc: email.cc ? email.cc.join(',') : undefined,
      bcc: email.bcc ? email.bcc.join(',') : undefined,
      subject: email.subject,
      html: emailBody
    };

    console.log('📤 Sending email...');
    await transporter.sendMail(mailOptions);
    
    // Update email status
    await ScheduledEmail.findByIdAndUpdate(email._id, {
      status: 'sent',
      sentAt: new Date()
    });

    console.log('✅ EMAIL SENT SUCCESSFULLY WITH RICH CONTENT!');
    console.log(`📧 Sent to: ${email.to.join(', ')}`);
    console.log(`📋 Subject: ${email.subject}`);
    console.log(`📊 Content included: Title, Summary, CVE IDs, IOCs, Technical Analysis, References, Tags`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error processing email:', error);
    
    try {
      const ScheduledEmailSchema = new mongoose.Schema({}, { strict: false });
      const ScheduledEmail = mongoose.models.ScheduledEmail || mongoose.model('ScheduledEmail', ScheduledEmailSchema);
      
      await ScheduledEmail.findByIdAndUpdate('688c56474e3f28c5d57b7599', {
        status: 'failed',
        errorMessage: error.message,
        sentAt: new Date()
      });
    } catch (updateError) {
      console.error('Failed to update email status:', updateError);
    }
  }
};

processOverdueEmail();
