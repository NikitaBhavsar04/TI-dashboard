import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import nodemailer from 'nodemailer';

interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  customMessage?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify admin authentication using cookies (same as profile API)
    const tokenPayload = getUserFromRequest(req);
    console.log('Email API - Token payload:', tokenPayload);
    
    if (!tokenPayload) {
      console.log('Email API - No token payload found');
      return res.status(401).json({ message: 'No valid token provided' });
    }

    console.log('Email API - User role:', tokenPayload.role);
    if (tokenPayload.role !== 'admin') {
      console.log('Email API - User is not admin, role:', tokenPayload.role);
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('Email API - Admin authenticated successfully');

    const { id: advisoryId } = req.query;
    const { to, cc, bcc, subject, customMessage }: EmailData = req.body;

    console.log('Email API - Advisory ID:', advisoryId);
    console.log('Email API - Request body:', { to, cc, bcc, subject, customMessage });

    if (!advisoryId || !to || to.length === 0) {
      console.log('Email API - Missing advisory ID or recipients');
      return res.status(400).json({ message: 'Advisory ID and recipient emails are required' });
    }

    // Connect to database and get advisory
    await dbConnect();
    const advisory = await Advisory.findById(advisoryId);
    
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Create email transporter (configure with your SMTP settings)
    const transporter = nodemailer.createTransport({
      // For development/testing - use services like Gmail, SendGrid, etc.
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Generate email content
    const emailSubject = subject || `THREAT ALERT: ${advisory.title}`;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ThreatWatch Advisory</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e293b, #475569); color: white; padding: 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { opacity: 0.9; }
        .content { padding: 30px; }
        .severity { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: bold; color: white; margin-bottom: 20px; }
        .severity.Critical { background-color: #dc2626; }
        .severity.High { background-color: #ea580c; }
        .severity.Medium { background-color: #d97706; }
        .severity.Low { background-color: #16a34a; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        .meta-info { background: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
        .meta-row { display: flex; margin-bottom: 8px; }
        .meta-label { font-weight: bold; width: 120px; color: #475569; }
        .ioc-list { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 10px 0; }
        .ioc-item { margin-bottom: 8px; }
        .ioc-type { background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
        .recommendations { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 10px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🛡️ THREATWATCH</div>
          <div class="subtitle">Cybersecurity Intelligence Platform</div>
        </div>
        
        <div class="content">
          ${customMessage ? `
          <div class="warning">
            <strong>Message from Admin:</strong><br>
            ${customMessage}
          </div>
          ` : ''}
          
          <h1>${advisory.title}</h1>
          <span class="severity ${advisory.severity}">${advisory.severity.toUpperCase()}</span>
          
          <div class="meta-info">
            <div class="meta-row">
              <span class="meta-label">Published:</span>
              <span>${new Date(advisory.publishedDate).toLocaleDateString()}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Author:</span>
              <span>${advisory.author}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Category:</span>
              <span>${advisory.category}</span>
            </div>
            ${advisory.cvss ? `
            <div class="meta-row">
              <span class="meta-label">CVSS Score:</span>
              <span>${advisory.cvss}</span>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">Summary</div>
            <p>${advisory.summary || advisory.description}</p>
          </div>

          <div class="section">
            <div class="section-title">Description</div>
            <div>${advisory.content}</div>
          </div>

          ${advisory.iocs && advisory.iocs.length > 0 ? `
          <div class="section">
            <div class="section-title">Indicators of Compromise (IOCs)</div>
            <div class="ioc-list">
              ${advisory.iocs.map(ioc => `
                <div class="ioc-item">
                  <span class="ioc-type">${ioc.type}</span>
                  <strong>${ioc.value}</strong>
                  ${ioc.description ? `<br><small>${ioc.description}</small>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${advisory.recommendations && advisory.recommendations.length > 0 ? `
          <div class="section">
            <div class="section-title">Recommendations</div>
            <div class="recommendations">
              <ul>
                ${advisory.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          </div>
          ` : ''}

          ${advisory.references && advisory.references.length > 0 ? `
          <div class="section">
            <div class="section-title">References</div>
            <ul>
              ${advisory.references.map(ref => `<li><a href="${ref}" target="_blank">${ref}</a></li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>This advisory was sent from ThreatWatch Intelligence Platform</p>
          <p>© ${new Date().getFullYear()} ThreatWatch. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send email
    const mailOptions = {
      from: `"ThreatWatch Security" <${process.env.SMTP_USER}>`,
      to: to.join(', '),
      cc: cc?.join(', '),
      bcc: bcc?.join(', '),
      subject: emailSubject,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'Email sent successfully',
      recipients: {
        to: to.length,
        cc: cc?.length || 0,
        bcc: bcc?.length || 0
      }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
