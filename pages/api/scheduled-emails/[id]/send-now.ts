import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Verify admin authentication
  import { generateAdvisory4EmailTemplate } from '@/lib/advisory4TemplateGenerator';
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

    if (tokenPayload.role !== 'admin') {
      // Generate email HTML content using the template generator (renders all placeholders)
      const emailHtml = generateAdvisory4EmailTemplate(advisory, scheduledEmail.customMessage || '');
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

    // Generate tracking ID if not exists
    if (!scheduledEmail.trackingId) {
      scheduledEmail.trackingId = crypto.randomBytes(32).toString('hex');
      console.log(`📍 Generated tracking ID: ${scheduledEmail.trackingId}`);
    } else {
      console.log(`📍 Using existing tracking ID: ${scheduledEmail.trackingId}`);
    }

    // Inject tracking pixel into email body
    const trackingPixelUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/track-email/${scheduledEmail.trackingId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;" alt="" />`;
    
    console.log(`🔗 Tracking pixel URL: ${trackingPixelUrl}`);
    
    // Insert tracking pixel just before closing body tag
    let trackedEmailHtml = emailHtml;
    if (emailHtml.includes('</body>')) {
      trackedEmailHtml = emailHtml.replace('</body>', `${trackingPixel}</body>`);
      console.log(`✅ Tracking pixel injected before </body> tag`);
    } else {
      // If no body tag, append at the end
      trackedEmailHtml = emailHtml + trackingPixel;
      console.log(`✅ Tracking pixel appended to end of email`);
    }

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: scheduledEmail.to,
      cc: scheduledEmail.cc.length > 0 ? scheduledEmail.cc : undefined,
      bcc: scheduledEmail.bcc.length > 0 ? scheduledEmail.bcc : undefined,
      subject: scheduledEmail.subject,
      html: trackedEmailHtml
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
