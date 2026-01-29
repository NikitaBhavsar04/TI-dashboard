
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { generateAdvisory4EmailTemplate } from '@/lib/advisory4TemplateGenerator';

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

    // Fetch scheduled email and advisory
    const scheduledEmail = await ScheduledEmail.findById(id);
    if (!scheduledEmail) {
      return res.status(404).json({ message: 'Scheduled email not found' });
    }
    // TODO: Fetch advisory from OpenSearch or other source
    const advisory = null;
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Generate email HTML content using the template generator
    const emailHtml = generateAdvisory4EmailTemplate(advisory, scheduledEmail.customMessage || '');

    // Generate tracking ID if not exists
    if (!scheduledEmail.trackingId) {
      scheduledEmail.trackingId = crypto.randomBytes(32).toString('hex');
      await scheduledEmail.save();
    }

    // Inject tracking pixel into email body
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return res.status(500).json({ message: 'Application URL not configured' });
    }
    const trackingPixelUrl = `${baseUrl}/api/track-email/${scheduledEmail.trackingId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;" alt="" />`;
    let trackedEmailHtml = emailHtml;
    if (emailHtml.includes('</body>')) {
      trackedEmailHtml = emailHtml.replace('</body>', `${trackingPixel}</body>`);
    } else {
      trackedEmailHtml = emailHtml + trackingPixel;
    }

    // Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: scheduledEmail.to,
      cc: scheduledEmail.cc && scheduledEmail.cc.length > 0 ? scheduledEmail.cc : undefined,
      bcc: scheduledEmail.bcc && scheduledEmail.bcc.length > 0 ? scheduledEmail.bcc : undefined,
      subject: scheduledEmail.subject,
      html: trackedEmailHtml,
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
        cc: scheduledEmail.cc ? scheduledEmail.cc.length : 0,
        bcc: scheduledEmail.bcc ? scheduledEmail.bcc.length : 0,
      },
    });
  } catch (error: any) {
    console.error('Send now API error:', error);
    try {
      await ScheduledEmail.findByIdAndUpdate(id, {
        status: 'failed',
        errorMessage: error.message,
        $inc: { retryCount: 1 },
      });
    } catch (updateError) {
      console.error('Failed to update scheduled email status:', updateError);
    }
    res.status(500).json({
      message: 'Failed to send email',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    });
  }
}
