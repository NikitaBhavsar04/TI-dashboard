import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    // Verify admin authentication
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

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

      // Only allow deletion of pending emails
      if (scheduledEmail.status !== 'pending') {
        return res.status(400).json({ message: 'Can only delete pending emails' });
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
        const scheduleDateTime = new Date(scheduledDate);
        const now = new Date();
        
        if (scheduleDateTime <= now) {
          return res.status(400).json({ message: 'Scheduled time must be in the future' });
        }
        scheduledEmail.scheduledDate = scheduleDateTime;
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
