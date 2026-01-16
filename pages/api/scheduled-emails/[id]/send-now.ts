import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    await dbConnect();
    
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

    if (tokenPayload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const scheduledEmail = await ScheduledEmail.findById(id);
    if (!scheduledEmail) {
      return res.status(404).json({ message: 'Scheduled email not found' });
    }

    const advisory = await Advisory.findById(scheduledEmail.advisoryId);
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Update scheduled email status
    scheduledEmail.status = 'sent';
    scheduledEmail.sentAt = new Date();
    await scheduledEmail.save();

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      emailId: scheduledEmail._id
    });

  } catch (error) {
    console.error('Error sending scheduled email:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    });
  }
}
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
