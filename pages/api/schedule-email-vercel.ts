// Vercel-compatible email scheduling API
import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import { sendEmail } from '@/lib/emailSender';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { advisoryId, recipients, scheduleTime } = req.body;

    // Create scheduled email record with proper timezone handling
    const scheduledEmail = new ScheduledEmail({
      advisoryId,
      recipients,
      scheduleTime: new Date(scheduleTime),
      status: 'pending',
      createdAt: new Date(),
    });

    await scheduledEmail.save();

    // Force UTC interpretation by adding Z, then subtract 5.5h to get UTC equivalent of IST input
    const scheduleTimeStr = typeof scheduleTime === 'string' && !scheduleTime.endsWith('Z')
      ? scheduleTime + 'Z'
      : scheduleTime;
    const scheduleDateTime = new Date(scheduleTimeStr);
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const userInputUTC = new Date(scheduleDateTime.getTime() - istOffsetMs);
    const nowUTC = new Date();
    
    if (userInputUTC <= nowUTC) {
      try {
        await sendEmail({
          to: recipients,
          subject: `Threat Advisory Notification`,
          body: `Advisory notification details here` // You may need to generate proper email body
        });
        scheduledEmail.status = 'sent';
        scheduledEmail.sentAt = new Date();
        await scheduledEmail.save();
      } catch (error) {
        console.error('Email sending failed:', error);
        scheduledEmail.status = 'failed';
        scheduledEmail.error = error.message;
        await scheduledEmail.save();
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Email scheduled successfully',
      emailId: scheduledEmail._id 
    });

  } catch (error) {
    console.error('Schedule email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to schedule email' 
    });
  }
}
