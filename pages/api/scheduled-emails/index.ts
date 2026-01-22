import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '@/lib/auth';
import dbConnect from '@/lib/db';
import ScheduledEmail from '@/models/ScheduledEmail';
import Advisory from '@/models/Advisory';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify admin authentication
    const tokenPayload = getUserFromRequest(req);
    
    if (!tokenPayload) {
      return res.status(401).json({ message: 'No valid token provided' });
    }

    if (tokenPayload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await dbConnect();

    if (req.method === 'GET') {
      // Get all scheduled emails for admin
      const scheduledEmails = await ScheduledEmail.find()
        .sort({ createdAt: -1 })
        .lean();

      console.log(`📧 Found ${scheduledEmails.length} scheduled emails in database`);

      // Try to populate advisory info for each email
      const transformedEmails = await Promise.all(scheduledEmails.map(async (email) => {
        let advisory = null;
        
        // Try to fetch advisory info if advisoryId exists
        if (email.advisoryId) {
          try {
            // Check if it's a valid MongoDB ObjectId format (24 hex characters)
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(email.advisoryId.toString());
            
            if (isValidObjectId) {
              const advisoryDoc = await Advisory.findById(email.advisoryId).select('title severity').lean();
              if (advisoryDoc) {
                advisory = {
                  title: advisoryDoc.title,
                  severity: advisoryDoc.severity
                };
              }
            } else {
              // This is likely an Eagle Nest advisory with custom ID format
              // Try to load from JSON file
              const fs = require('fs');
              const path = require('path');
              const eagleNestPath = path.resolve(process.cwd(), 'backend', 'workspace', 'eagle_nest', `${email.advisoryId}.json`);
              
              if (fs.existsSync(eagleNestPath)) {
                const eagleNestData = JSON.parse(fs.readFileSync(eagleNestPath, 'utf8'));
                advisory = {
                  title: eagleNestData.title || 'Eagle Nest Advisory',
                  severity: eagleNestData.severity || 'Unknown'
                };
              }
            }
          } catch (err) {
            console.log(`⚠️ Could not find advisory ${email.advisoryId} for email ${email._id}: ${err.message}`);
          }
        }

        return {
          ...email,
          _id: email._id.toString(),
          advisoryId: email.advisoryId?.toString() || email.advisoryId,
          advisory
        };
      }));

      console.log(`Returning ${transformedEmails.length} scheduled emails`);

      return res.status(200).json({
        scheduledEmails: transformedEmails
      });
    }

    if (req.method === 'POST') {
      // Create new scheduled email (this could be moved to the existing schedule-email endpoint)
      const { advisoryId, to, cc, bcc, subject, customMessage, scheduledDate } = req.body;

      if (!advisoryId || !to || to.length === 0 || !scheduledDate) {
        return res.status(400).json({ message: 'Advisory ID, recipient emails, and scheduled date are required' });
      }

      const scheduleDateTime = new Date(scheduledDate);
      const now = new Date();
      
      if (scheduleDateTime <= now) {
        return res.status(400).json({ message: 'Scheduled time must be in the future' });
      }

      const advisory = await Advisory.findById(advisoryId);
      if (!advisory) {
        return res.status(404).json({ message: 'Advisory not found' });
      }

      const scheduledEmail = new ScheduledEmail({
        advisoryId,
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

      // Also create Agenda job for automatic processing
      try {
        const { startAgenda } = require('@/lib/agenda');
        const agenda = await startAgenda();
        
        // Schedule the job
        if (scheduleDateTime <= now) {
          // If somehow the time has passed, process immediately
          await agenda.now('send-scheduled-email', { emailId: scheduledEmail._id.toString() });
        } else {
          // Schedule for the future
          await agenda.schedule(scheduleDateTime, 'send-scheduled-email', { emailId: scheduledEmail._id.toString() });
        }
        
        console.log(`📧 Agenda job created for email ${scheduledEmail._id} scheduled at ${scheduleDateTime}`);
      } catch (agendaError) {
        console.error('Failed to create Agenda job:', agendaError);
        // Don't fail the whole request if Agenda fails
      }

      return res.status(201).json({
        message: 'Email scheduled successfully',
        scheduledEmail
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });

  } catch (error) {
    console.error('Scheduled emails API error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}
