import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Verify admin authentication
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

    if (tokenPayload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await dbConnect();

    // Get scheduled email
    const scheduledEmail = await ScheduledEmail.findById(id);
    
    if (!scheduledEmail) {
      return res.status(404).json({ message: 'Scheduled email not found' });
    }

    // Only allow sending of pending emails
    if (scheduledEmail.status !== 'pending') {
      return res.status(400).json({ message: 'Can only send pending emails' });
    }

    // Get advisory details
    const advisory = await Advisory.findById(scheduledEmail.advisoryId);
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Generate email HTML content (reuse from existing email endpoint)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${scheduledEmail.subject}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 30px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 30px; }
            .alert-banner { background-color: ${advisory.severity === 'Critical' ? '#dc2626' : advisory.severity === 'High' ? '#ea580c' : advisory.severity === 'Medium' ? '#d97706' : '#16a34a'}; color: white; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .severity { font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .advisory-title { font-size: 24px; font-weight: bold; margin: 20px 0; color: #1e293b; }
            .meta-info { background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .description { margin: 20px 0; }
            .iocs { background-color: #fef7cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { background-color: #1e293b; color: white; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🛡️ ThreatWatch</div>
              <p>Cybersecurity Threat Advisory</p>
            </div>
            
            <div class="content">
              ${scheduledEmail.customMessage ? `<div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;"><p><strong>Message from Admin:</strong></p><p>${scheduledEmail.customMessage}</p></div>` : ''}
              
              <div class="alert-banner">
                <div class="severity">⚠️ ${advisory.severity} THREAT ALERT</div>
              </div>
              
              <h1 class="advisory-title">${advisory.title}</h1>
              
              <div class="meta-info">
                <p><strong>🔍 Severity:</strong> ${advisory.severity}</p>
                <p><strong>📁 Category:</strong> ${advisory.category}</p>
                <p><strong>✍️ Author:</strong> ${advisory.author}</p>
                <p><strong>📅 Published:</strong> ${new Date(advisory.publishedDate).toLocaleDateString()}</p>
                ${advisory.cvss ? `<p><strong>📊 CVSS Score:</strong> ${advisory.cvss}</p>` : ''}
              </div>

              ${advisory.summary ? `<div class="description"><h3>📋 Summary</h3><p>${advisory.summary}</p></div>` : ''}
              
              <div class="description">
                <h3>📝 Description</h3>
                <p>${advisory.description}</p>
              </div>
              
              ${advisory.iocs && advisory.iocs.length > 0 ? `
                <div class="iocs">
                  <h3>🎯 Indicators of Compromise (IOCs)</h3>
                  ${advisory.iocs.map((ioc: any) => `
                    <p><strong>${ioc.type}:</strong> <code>${ioc.value}</code>
                    ${ioc.description ? `<br><em>${ioc.description}</em>` : ''}</p>
                  `).join('')}
                </div>
              ` : ''}
              
              ${advisory.cveIds && advisory.cveIds.length > 0 ? `
                <div class="meta-info">
                  <h3>🔗 Related CVEs</h3>
                  <p>${advisory.cveIds.join(', ')}</p>
                </div>
              ` : ''}
              
              ${advisory.references && advisory.references.length > 0 ? `
                <div class="description">
                  <h3>📚 References</h3>
                  <ul>
                    ${advisory.references.map((ref: string) => `<li><a href="${ref}" target="_blank">${ref}</a></li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p>This is an automated threat advisory from ThreatWatch</p>
              <p>Stay vigilant and keep your systems updated</p>
              <p><em>Sent on ${new Date().toLocaleString()}</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: scheduledEmail.to,
      cc: scheduledEmail.cc.length > 0 ? scheduledEmail.cc : undefined,
      bcc: scheduledEmail.bcc.length > 0 ? scheduledEmail.bcc : undefined,
      subject: scheduledEmail.subject,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);

    // Update scheduled email status
    scheduledEmail.status = 'sent';
    scheduledEmail.sentAt = new Date();
    await scheduledEmail.save();

    res.status(200).json({
      message: 'Email sent successfully',
      recipients: {
        to: scheduledEmail.to.length,
        cc: scheduledEmail.cc.length,
        bcc: scheduledEmail.bcc.length
      }
    });

  } catch (error) {
    console.error('Send now API error:', error);
    
    // Update scheduled email status to failed
    try {
      await ScheduledEmail.findByIdAndUpdate(id, {
        status: 'failed',
        errorMessage: error.message,
        $inc: { retryCount: 1 }
      });
    } catch (updateError) {
      console.error('Failed to update scheduled email status:', updateError);
    }

    res.status(500).json({ 
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
