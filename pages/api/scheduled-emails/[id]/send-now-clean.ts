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
    await dbConnect();
    
    // Verify admin authentication
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

    if (tokenPayload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Find the scheduled email
    const scheduledEmail = await ScheduledEmail.findById(id);
    if (!scheduledEmail) {
      return res.status(404).json({ message: 'Scheduled email not found' });
    }

    // Get the advisory
    const advisory = await Advisory.findById(scheduledEmail.advisoryId);
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // TODO: Implement immediate email sending logic
    // For now, just mark as sent
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