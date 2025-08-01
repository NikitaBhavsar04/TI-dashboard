import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Advisory from '@/models/Advisory';
import ScheduledEmail from '@/models/ScheduledEmail';

interface ScheduleEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  customMessage?: string;
  scheduledDate: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const tokenPayload = getUserFromRequest(req);
    console.log('Schedule Email API - Token payload:', tokenPayload);
    
    if (!tokenPayload) {
      console.log('Schedule Email API - No token payload found');
      return res.status(401).json({ message: 'No valid token provided' });
    }

    console.log('Schedule Email API - User role:', tokenPayload.role);
    if (tokenPayload.role !== 'admin') {
      console.log('Schedule Email API - User is not admin, role:', tokenPayload.role);
      return res.status(403).json({ message: 'Admin access required' });
    }

    console.log('Schedule Email API - Admin authenticated successfully');

    const { id: advisoryId } = req.query;
    const { to, cc, bcc, subject, customMessage, scheduledDate }: ScheduleEmailData = req.body;

    console.log('Schedule Email API - Advisory ID:', advisoryId);
    console.log('Schedule Email API - Request body:', { to, cc, bcc, subject, customMessage, scheduledDate });

    if (!advisoryId || !to || to.length === 0 || !scheduledDate) {
      console.log('Schedule Email API - Missing required fields');
      return res.status(400).json({ message: 'Advisory ID, recipient emails, and scheduled date are required' });
    }

    // Validate scheduled date is in the future
    const scheduleDateTime = new Date(scheduledDate);
    const now = new Date();
    
    if (scheduleDateTime <= now) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }

    // Connect to database and get advisory
    await dbConnect();
    
    const advisory = await Advisory.findById(advisoryId);
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Create scheduled email record
    const scheduledEmail = new ScheduledEmail({
      advisoryId: advisoryId as string,
      to: to || [],
      cc: cc || [],
      bcc: bcc || [],
      subject: subject || `THREAT ALERT: ${advisory.title}`,
      customMessage: customMessage || '',
      scheduledDate: scheduleDateTime,
      createdBy: tokenPayload.userId,
      status: 'pending'
    });

    await scheduledEmail.save();

    console.log('Schedule Email API - Email scheduled successfully:', scheduledEmail._id);

    res.status(200).json({
      message: 'Email scheduled successfully',
      scheduledEmail: {
        id: scheduledEmail._id,
        scheduledDate: scheduleDateTime,
        status: 'pending',
        recipients: {
          to: to.length,
          cc: cc ? cc.length : 0,
          bcc: bcc ? bcc.length : 0
        }
      }
    });

  } catch (error) {
    console.error('Schedule Email API error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
