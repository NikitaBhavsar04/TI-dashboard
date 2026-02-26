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

    if (req.method === 'DELETE') {
      // Delete scheduled email
      const scheduledEmail = await ScheduledEmail.findById(id);
      
      if (!scheduledEmail) {
        return res.status(404).json({ message: 'Scheduled email not found' });
      }

      // super_admin can delete any email; admin can only delete pending emails
      if (tokenPayload.role !== 'super_admin' && scheduledEmail.status !== 'pending') {
        return res.status(400).json({ message: 'Admins can only delete pending emails. Contact a super admin to delete sent/failed emails.' });
      }

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
      if (scheduledDate) {
// Force UTC interpretation by adding Z, then subtract 5.5h to get UTC equivalent of IST input
      const dateStr = scheduledDate.includes('Z') ? scheduledDate : scheduledDate + 'Z';
      const scheduleDateTime = new Date(dateStr);
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const scheduledAtUTC = new Date(scheduleDateTime.getTime() - istOffsetMs);
        const now = new Date();
        
        if (scheduledAtUTC <= now) {
          return res.status(400).json({ message: 'Scheduled time must be in the future' });
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

    res.setHeader('Allow', ['DELETE', 'PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });

  } catch (error) {
    console.error('Scheduled email management API error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
