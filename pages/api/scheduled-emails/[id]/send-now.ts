
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import crypto from 'crypto';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
const { generateAdvisory4EmailTemplate } = require('@/lib/advisory4TemplateGenerator');

// OpenSearch client — same config as agenda.js and send-advisory.js
const osClient = new OpenSearchClient({
  node: process.env.OPENSEARCH_URL || `https://${process.env.OPENSEARCH_HOST}:${process.env.OPENSEARCH_PORT || '9200'}`,
  ssl: { rejectUnauthorized: false },
  ...(process.env.OPENSEARCH_USERNAME && process.env.OPENSEARCH_PASSWORD
    ? { auth: { username: process.env.OPENSEARCH_USERNAME, password: process.env.OPENSEARCH_PASSWORD } }
    : {})
});
const ADVISORY_INDEX = 'ti-generated-advisories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    await dbConnect();

    // Auth check — same pattern as all other working API endpoints
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const tokenPayload = verifyToken(token);
    if (!tokenPayload) return res.status(401).json({ message: 'Invalid or expired token' });
    if (tokenPayload.role !== 'admin' && tokenPayload.role !== 'super_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Fetch the scheduled email from MongoDB
    const scheduledEmail = await ScheduledEmail.findById(id);
    if (!scheduledEmail) {
      return res.status(404).json({ message: 'Scheduled email not found' });
    }

    if (scheduledEmail.status === 'sent') {
      return res.status(400).json({ message: 'Email has already been sent' });
    }

    // Fetch advisory from OpenSearch
    console.log(`[SEND-NOW] Fetching advisory from OpenSearch: ${scheduledEmail.advisoryId}`);
    let advisory: any;
    try {
      const osResponse = await osClient.get({
        index: ADVISORY_INDEX,
        id: scheduledEmail.advisoryId
      });
      if (!osResponse.body._source) {
        return res.status(404).json({ message: 'Advisory not found in OpenSearch' });
      }
      advisory = { ...osResponse.body._source, _id: scheduledEmail.advisoryId };
      console.log(`[SEND-NOW] Advisory loaded: ${advisory.title || advisory.advisory_id}`);
    } catch (osErr: any) {
      console.error('[SEND-NOW] OpenSearch fetch failed:', osErr.message);
      return res.status(500).json({ message: 'Failed to fetch advisory from OpenSearch', error: osErr.message });
    }

    // Build email HTML.
    // Read body and emailType via the raw MongoDB driver (bypasses Mongoose schema cache)
    // so the pre-generated IOC-aware body is guaranteed to be used even when the cached
    // model doesn't yet know about these fields.
    const rawDoc = await ScheduledEmail.collection.findOne(
      { _id: scheduledEmail._id },
      { projection: { body: 1, emailType: 1 } }
    );
    const storedBody: string | null = rawDoc && rawDoc.body ? rawDoc.body : null;
    const storedEmailType: string = rawDoc && rawDoc.emailType ? rawDoc.emailType : 'general';
    console.log(`[SEND-NOW] Raw MongoDB read — emailType: '${storedEmailType}', hasBody: ${!!storedBody}, bodyLen: ${storedBody ? storedBody.length : 0}`);

    let emailBody: string;

    if (storedBody) {
      emailBody = storedBody;
      console.log(`[SEND-NOW] ✅ Using stored pre-generated email body (${emailBody.length} chars)`);
      console.log(`[SEND-NOW] Stored body contains IOC section: ${emailBody.includes('IOC DETECTION ALERT')}`);
    } else {
      console.log(`[SEND-NOW] ⚠️ No stored body — regenerating from OpenSearch data (emailType='${storedEmailType}')`);
      let iocDetectionData: any = null;
      if (
        storedEmailType === 'dedicated' &&
        advisory.ip_sweep &&
        Array.isArray(advisory.ip_sweep.impacted_clients) &&
        advisory.ip_sweep.impacted_clients.length > 0
      ) {
        const impacted = advisory.ip_sweep.impacted_clients.find((ic: any) =>
          ic.client_id === scheduledEmail.clientId || ic.client_name === scheduledEmail.clientName
        );
        if (impacted && impacted.matches && impacted.matches.length > 0) {
          iocDetectionData = {
            client_name: impacted.client_name || impacted.client_id || scheduledEmail.clientName,
            checked_at: advisory.ip_sweep.checked_at,
            match_count: impacted.matches.length,
            matches: impacted.matches
          };
          console.log(`[SEND-NOW] Found IOC match for client — including detection alert`);
        } else {
          console.log(`[SEND-NOW] Client not in impacted_clients — sending without IOC alert`);
        }
      }
      emailBody = generateAdvisory4EmailTemplate(advisory, scheduledEmail.customMessage || '', iocDetectionData);
    }

    // Generate / reuse tracking ID
    if (!scheduledEmail.trackingId) {
      scheduledEmail.trackingId = crypto.randomBytes(32).toString('hex');
      await scheduledEmail.save();
    }

    // Inject tracking pixel
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const trackingPixelUrl = `${baseUrl}/api/track-email/${scheduledEmail.trackingId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;" alt="" />`;
    const trackedEmailBody = emailBody.includes('</body>')
      ? emailBody.replace('</body>', `${trackingPixel}</body>`)
      : emailBody + trackingPixel;

    // Send via SMTP + app password
    const nodemailer = require('nodemailer');

    const recipients = Array.isArray(scheduledEmail.to) ? scheduledEmail.to : [scheduledEmail.to];
    const mailOptions: any = {
      from: process.env.SMTP_USER,
      to: recipients.join(', '),
      subject: scheduledEmail.subject,
      html: trackedEmailBody
    };
    if (scheduledEmail.cc && scheduledEmail.cc.length > 0) {
      mailOptions.cc = Array.isArray(scheduledEmail.cc) ? scheduledEmail.cc.join(', ') : scheduledEmail.cc;
    }
    if (scheduledEmail.bcc && scheduledEmail.bcc.length > 0) {
      mailOptions.bcc = Array.isArray(scheduledEmail.bcc) ? scheduledEmail.bcc.join(', ') : scheduledEmail.bcc;
    }

    console.log(`[SEND-NOW] Sending to: ${mailOptions.to}`);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false }
    } as any);

    const info = await transporter.sendMail(mailOptions);
    transporter.close();
    console.log(`[SEND-NOW] ✅ Sent via SMTP — Message-ID: ${info.messageId}`);

    // Mark as sent in MongoDB
    scheduledEmail.status = 'sent';
    scheduledEmail.sentAt = new Date();
    await scheduledEmail.save();

    return res.status(200).json({
      message: 'Email sent successfully',
      messageId: info.messageId,
      recipients: {
        to: recipients.length,
        cc: scheduledEmail.cc?.length || 0,
        bcc: scheduledEmail.bcc?.length || 0
      }
    });

  } catch (error: any) {
    console.error('[SEND-NOW] Error:', error);
    try {
      await ScheduledEmail.findByIdAndUpdate(id, {
        status: 'failed',
        errorMessage: error.message,
        $inc: { retryCount: 1 }
      });
    } catch (_) {}
    return res.status(500).json({
      message: 'Failed to send email',
      error: error.message
    });
  }
}

