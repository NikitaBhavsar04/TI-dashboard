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

    // Generate rich email content with dark theme
    const generateEmailBody = (advisory, customMessage) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
      
      // TLP Color mapping
      const tlpColors = {
        'clear': { bg: '#f8fafc', text: '#1e293b', border: '#64748b' },
        'white': { bg: '#ffffff', text: '#1e293b', border: '#94a3b8' },
        'green': { bg: '#22c55e', text: '#ffffff', border: '#16a34a' },
        'amber': { bg: '#f59e0b', text: '#ffffff', border: '#d97706' },
        'yellow': { bg: '#eab308', text: '#ffffff', border: '#ca8a04' },
        'red': { bg: '#ef4444', text: '#ffffff', border: '#dc2626' }
      };
      
      const tlpColor = tlpColors[advisory.tlp?.toLowerCase()] || tlpColors.clear;

      return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Threat Advisory: ${advisory.title}</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #e5e7eb; 
            background: linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%);
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100vh;
        }
        
        .container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            border: 1px solid #374151;
            min-height: 100vh;
        }
        
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white; 
            padding: 25px 30px; 
            text-align: center;
            position: relative;
            border-bottom: 3px solid #3b82f6;
        }
        
        .logos {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            margin-top: 0px;
            gap: 20px;
        }
        
        .logo-placeholder {
            width: 200px;
            height: 60px;
            background: transparent;
            border: none;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #ffffff;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header h2 {
            font-size: 18px;
            font-weight: 400;
            margin: 0;
            color: #e0f2fe;
            opacity: 0.95;
        }
        
        .tlp-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.75px;
            background: ${tlpColor.bg} !important;
            color: ${tlpColor.text} !important;
            border: 2px solid ${tlpColor.border} !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .tlp-badge::before {
            content: "TLP: ";
            font-weight: 700;
        }
        
        .content { 
            padding: 30px;
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
        }
        
        .section {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 20px;
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            border: 1px solid #6b7280;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .section-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #f9fafb;
            margin: 0;
            letter-spacing: -0.25px;
        }
        
        .severity { 
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: 600; 
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .critical { 
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            border: 1px solid #fecaca;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .high { 
            background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
            border: 1px solid #fed7aa;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .medium { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: 1px solid #fde68a;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .low { 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: 1px solid #6ee7b7;
            color: #ffffff;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        h3 {
            font-size: 18px;
            font-weight: 600;
            color: #f9fafb;
            margin: 24px 0 12px 0;
        }
        
        p, li {
            font-size: 15px;
            color: #d1d5db;
            line-height: 1.6;
        }
        
        .footer { 
            background: linear-gradient(135deg, #111827 0%, #000000 100%);
            padding: 32px 30px; 
            text-align: center; 
            border-top: 3px solid #3b82f6;
            color: #9ca3af;
        }
        
        .footer h3 {
            font-size: 20px;
            font-weight: 700;
            color: #f9fafb;
            margin: 0 0 8px 0;
        }
        
        .footer p {
            margin: 6px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logos">
                <div class="logo-placeholder">
                    <img src="https://i.ibb.co/pv0VB82D/cybertech-logo.png" alt="CyberTech Logo" style="height: 60px; width: auto; background: transparent;">
                </div>
                <div class="logo-placeholder">
                    <img src="https://i.ibb.co/20vhMNrh/Eagleye-logo-1.png" alt="Eagleye Logo" style="height: 60px; width: auto; background: transparent;">
                </div>
            </div>
            <h1>🔒 THREAT ADVISORY</h1>
            <h2>${advisory.title}</h2>
            ${advisory.tlp ? `
            <div style="margin-top: 12px;">
                <span class="tlp-badge">
                    ${advisory.tlp.toUpperCase()}
                </span>
            </div>
            ` : ''}
        </div>
        
        <div class="content">
            ${customMessage ? `
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">📢</div>
                    <h2 class="section-title">Message from Security Team</h2>
                </div>
                <p>${customMessage}</p>
            </div>
            ` : ''}
            
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">⚠️</div>
                    <h2 class="section-title">Threat Parameters</h2>
                </div>
                <p><strong>Severity:</strong> <span class="severity ${advisory.severity?.toLowerCase() || 'low'}">${(advisory.severity || 'Unknown').toUpperCase()}</span></p>
                ${advisory.cvss ? `<p><strong>CVSS Score:</strong> ${advisory.cvss}/10</p>` : ''}
            </div>
            
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">📊</div>
                    <h2 class="section-title">Executive Summary</h2>
                </div>
                <p>${advisory.executiveSummary || advisory.summary || 'No summary available.'}</p>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <div class="section-icon">📄</div>
                    <h2 class="section-title">For Complete Details</h2>
                </div>
                <p>For comprehensive threat analysis and detailed information, please visit:</p>
                <p><a href="${baseUrl}/advisory/${advisory._id}" style="color: #60a5fa; text-decoration: none;">View Full Advisory Report</a></p>
            </div>
        </div>
        
        <div class="footer">
            <h3>🦅 EaglEye IntelDesk</h3>
            <p><strong>🛡️ Threat Intelligence Platform</strong></p>
            <p>🔬 Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 16px; font-style: italic;">
                🤖 This is an automated security advisory from your threat intelligence system.<br>
                📧 Please do not reply to this email. For support, contact your security team.
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
