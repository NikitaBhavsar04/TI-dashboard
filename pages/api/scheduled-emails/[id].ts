import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const tokenPayload = verifyToken(token);
    if (!tokenPayload) return res.status(401).json({ message: 'Invalid or expired token' });
    if (tokenPayload.role !== 'admin' && tokenPayload.role !== 'super_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await dbConnect();

    if (req.method === 'PATCH') {
      // Cancel a pending scheduled email (keeps the record, just prevents sending)
      const scheduledEmail = await ScheduledEmail.findById(id);
      if (!scheduledEmail) {
        return res.status(404).json({ message: 'Scheduled email not found' });
      }
      if (scheduledEmail.status !== 'pending') {
        return res.status(400).json({
          message: `Cannot cancel an email with status '${scheduledEmail.status}'. Only pending emails can be cancelled.`
        });
      }
      scheduledEmail.status = 'cancelled';
      await scheduledEmail.save();
      console.log(`[SCHEDULED-EMAIL] Cancelled email ${id}`);
      return res.status(200).json({ message: 'Scheduled email cancelled successfully', scheduledEmail });
    }

    if (req.method === 'DELETE') {
      // Delete scheduled email
      const scheduledEmail = await ScheduledEmail.findById(id);
      
      if (!scheduledEmail) {
        return res.status(404).json({ message: 'Scheduled email not found' });
      }

      // Any admin or super_admin can delete any email regardless of status

      await ScheduledEmail.findByIdAndDelete(id);

      return res.status(200).json({
        message: 'Scheduled email deleted successfully'
      });
    }

    if (req.method === 'PUT') {
      // Update scheduled email
      const { to, cc, bcc, subject, customMessage, scheduledDate } = req.body;

      const scheduledEmail = await ScheduledEmail.findById(id);
      
      if (!scheduledEmail) {
        return res.status(404).json({ message: 'Scheduled email not found' });
      }

      // Only allow editing of pending emails
      if (scheduledEmail.status !== 'pending') {
        return res.status(400).json({ message: 'Can only edit pending emails' });
      }

      // Validate scheduled date if provided
      // Accepts scheduledDate (YYYY-MM-DD) + scheduledTime (HH:mm) in IST, same as send-advisory.js
      const { scheduledTime } = req.body;
      if (scheduledDate && scheduledTime) {
        // Build the datetime string and treat user input as IST, then convert to UTC
        const dateTimeString = `${scheduledDate}T${scheduledTime}:00Z`;
        const userInputAsUTC = new Date(dateTimeString);
        if (isNaN(userInputAsUTC.getTime())) {
          return res.status(400).json({ message: 'Invalid date or time format' });
        }
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const scheduledAtUTC = new Date(userInputAsUTC.getTime() - istOffsetMs);
        const now = new Date();
        console.log(`⏰ [EDIT] IST input=${dateTimeString}, UTC=${scheduledAtUTC.toISOString()}, Current UTC=${now.toISOString()}`);
        if (scheduledAtUTC <= now) {
          return res.status(400).json({ message: 'Scheduled time must be in the future (Indian Standard Time)' });
        }
        scheduledEmail.scheduledDate = scheduledAtUTC;
      }

      // Update fields
      if (to) scheduledEmail.to = to;
      if (cc) scheduledEmail.cc = cc;
      if (bcc) scheduledEmail.bcc = bcc;
      if (subject) scheduledEmail.subject = subject;
      if (customMessage !== undefined) scheduledEmail.customMessage = customMessage;

      await scheduledEmail.save();

      return res.status(200).json({
        message: 'Scheduled email updated successfully',
        scheduledEmail
      });
    }

    res.setHeader('Allow', ['DELETE', 'PUT', 'PATCH']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });

  } catch (error) {
    console.error('Scheduled email management API error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
