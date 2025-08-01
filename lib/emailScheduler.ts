import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';
import dbConnect from '@/lib/db';
import nodemailer from 'nodemailer';

interface EmailConfig {
  service: string;
  user: string;
  pass: string;
}

const getEmailConfig = (): EmailConfig => {
  return {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || ''
  };
};

const createTransporter = () => {
  const config = getEmailConfig();
  return nodemailer.createTransporter({
    service: config.service,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
};

const generateEmailHTML = (advisory: any, customMessage: string = '') => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Threat Advisory: ${advisory.title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
        .alert-badge { display: inline-block; background-color: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px; }
        .severity { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        .severity.critical { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .severity.high { background-color: #fed7aa; color: #ea580c; border: 1px solid #fdba74; }
        .severity.medium { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        .severity.low { background-color: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .custom-message { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin-bottom: 24px; border-radius: 0 6px 6px 0; }
        .advisory-details { background-color: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .advisory-details h3 { margin-top: 0; color: #1e293b; }
        .meta-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; font-size: 14px; color: #64748b; }
        .meta-item { background-color: #f1f5f9; padding: 12px; border-radius: 6px; }
        .meta-item strong { color: #334155; }
        .description { background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .cta-button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .warning-box { background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .warning-box h4 { margin-top: 0; color: #dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ THREAT ADVISORY</h1>
          <div class="alert-badge">SECURITY ALERT</div>
        </div>
        
        <div class="content">
          ${customMessage ? `
            <div class="custom-message">
              <h4 style="margin-top: 0; color: #0ea5e9;">📢 Important Message</h4>
              <p style="margin-bottom: 0;">${customMessage}</p>
            </div>
          ` : ''}
          
          <h2 style="color: #1e293b; margin-bottom: 20px;">${advisory.title}</h2>
          
          <div class="severity ${advisory.severity.toLowerCase()}">
            🚨 SEVERITY: ${advisory.severity.toUpperCase()}
          </div>
          
          <div class="meta-info">
            <div class="meta-item">
              <strong>Advisory ID:</strong><br>
              ${advisory._id || advisory.id}
            </div>
            <div class="meta-item">
              <strong>Published:</strong><br>
              ${new Date(advisory.publishedDate).toLocaleDateString()}
            </div>
            <div class="meta-item">
              <strong>Category:</strong><br>
              ${advisory.category}
            </div>
            <div class="meta-item">
              <strong>Author:</strong><br>
              ${advisory.author}
            </div>
          </div>
          
          <div class="advisory-details">
            <h3>📋 Advisory Details</h3>
            <div class="description">
              ${advisory.description.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          ${advisory.severity === 'Critical' ? `
            <div class="warning-box">
              <h4>⚠️ CRITICAL ALERT</h4>
              <p>This is a critical security advisory that requires immediate attention. Please review and implement necessary security measures as soon as possible.</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/advisory/${advisory._id || advisory.id}" class="cta-button">
              📖 View Full Advisory
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>
            <strong>Threat Advisory System</strong><br>
            This email was sent as part of our security monitoring system.<br>
            For questions or concerns, please contact your security team.
          </p>
          <p style="margin-top: 15px; font-size: 11px; color: #94a3b8;">
            Sent on ${new Date().toLocaleString()} | 
            Advisory ID: ${advisory._id || advisory.id}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const processScheduledEmails = async () => {
  try {
    await dbConnect();
    
    const now = new Date();
    
    // Find emails that are due to be sent
    const dueEmails = await ScheduledEmail.find({
      status: 'pending',
      scheduledDate: { $lte: now },
      retryCount: { $lt: 3 } // Maximum 3 retry attempts
    }).populate('advisoryId');

    console.log(`Found ${dueEmails.length} emails to process`);

    for (const email of dueEmails) {
      try {
        const advisory = email.advisoryId;
        
        if (!advisory) {
          console.error(`Advisory not found for email ${email._id}`);
          await ScheduledEmail.findByIdAndUpdate(email._id, {
            status: 'failed',
            error: 'Advisory not found',
            lastAttempt: new Date()
          });
          continue;
        }

        const transporter = createTransporter();
        const htmlContent = generateEmailHTML(advisory, email.customMessage);

        const mailOptions = {
          from: `"Threat Advisory System" <${getEmailConfig().user}>`,
          to: email.to,
          cc: email.cc.length > 0 ? email.cc : undefined,
          bcc: email.bcc.length > 0 ? email.bcc : undefined,
          subject: email.subject,
          html: htmlContent
        };

        await transporter.sendMail(mailOptions);

        // Mark as sent
        await ScheduledEmail.findByIdAndUpdate(email._id, {
          status: 'sent',
          sentDate: new Date(),
          lastAttempt: new Date()
        });

        console.log(`Successfully sent scheduled email ${email._id}`);

      } catch (error) {
        console.error(`Failed to send email ${email._id}:`, error);
        
        // Update retry count and error
        const updatedEmail = await ScheduledEmail.findByIdAndUpdate(
          email._id,
          {
            $inc: { retryCount: 1 },
            error: error instanceof Error ? error.message : 'Unknown error',
            lastAttempt: new Date()
          },
          { new: true }
        );

        // Mark as failed if max retries reached
        if (updatedEmail && updatedEmail.retryCount >= 3) {
          await ScheduledEmail.findByIdAndUpdate(email._id, {
            status: 'failed'
          });
          console.log(`Email ${email._id} marked as failed after 3 attempts`);
        }
      }
    }

    return { processed: dueEmails.length };
  } catch (error) {
    console.error('Error processing scheduled emails:', error);
    throw error;
  }
};

export const startEmailScheduler = () => {
  // Check for scheduled emails every minute
  const interval = setInterval(async () => {
    try {
      await processScheduledEmails();
    } catch (error) {
      console.error('Email scheduler error:', error);
    }
  }, 60000); // 60 seconds

  console.log('Email scheduler started - checking every minute');
  
  return interval;
};
