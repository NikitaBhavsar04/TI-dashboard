// pages/api/emails/send-advisory.js
import dbConnect from '../../../lib/db';
import Client from '../../../models/Client';
import Advisory from '../../../models/Advisory';
import ScheduledEmail from '../../../models/ScheduledEmail';
import { verifyToken } from '../../../lib/auth';
import nodemailer from 'nodemailer';
import { generateCyberThreatEmailTemplate } from '../../../lib/emailTemplateGenerator';
import mongoose from 'mongoose';
import crypto from 'crypto';

const { agenda } = require('../../../lib/agenda');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Verify admin access
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      advisoryId,
      recipients, // Array of { type: 'client' | 'individual' | 'csv_bulk', id?: string, emails?: string[] }
      subject,
      customMessage,
      scheduledDate,
      scheduledTime,
      isScheduled = false,
      trackingOptions = { enableTracking: true }, // Default to enabled for super admins
      csvEmails = [] // For CSV bulk emails
    } = req.body;

    // Validation
    if (!advisoryId || !recipients || !recipients.length || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify advisory exists
    const advisory = await Advisory.findById(advisoryId);
    if (!advisory) {
      return res.status(404).json({ message: 'Advisory not found' });
    }

    // Process recipients and create email jobs
    const emailJobs = [];
    const errors = [];

    for (const recipient of recipients) {
      try {
        let emailData = {
          subject,
          customMessage,
          advisoryId,
          createdBy: decoded.userId,
          status: 'pending', // Always start as pending, mark as sent after successful delivery
          cc: [],
          bcc: []
        };

        if (recipient.type === 'client') {
          // Fetch client and all their emails
          const client = await Client.findById(recipient.id);
          if (!client) {
            errors.push(`Client with ID ${recipient.id} not found`);
            continue;
          }

          if (!client.isActive) {
            errors.push(`Client ${client.name} is inactive`);
            continue;
          }

          emailData = {
            ...emailData,
            to: client.emails
          };

          emailJobs.push({
            ...emailData,
            clientName: client.name
          });

        } else if (recipient.type === 'individual') {
          // Individual emails
          if (!recipient.emails || !recipient.emails.length) {
            errors.push('Individual recipient must have emails');
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const invalidEmails = recipient.emails.filter(email => !emailRegex.test(email));
          
          if (invalidEmails.length > 0) {
            errors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`);
            continue;
          }

          emailData = {
            ...emailData,
            to: recipient.emails
          };

          emailJobs.push(emailData);
        } else if (recipient.type === 'csv_bulk') {
          // CSV bulk emails - only for super_admin
          if (decoded.role !== 'super_admin') {
            errors.push('CSV bulk email requires super admin privileges');
            continue;
          }

          if (!csvEmails || !csvEmails.length) {
            errors.push('CSV bulk recipient must have email list');
            continue;
          }

          // Validate email format for CSV emails
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const invalidEmails = csvEmails.filter(email => !emailRegex.test(email));
          
          if (invalidEmails.length > 0) {
            errors.push(`Invalid email addresses in CSV: ${invalidEmails.slice(0, 5).join(', ')}${invalidEmails.length > 5 ? '...' : ''}`);
            continue;
          }

          // For CSV bulk, create individual jobs for privacy (BCC mode)
          csvEmails.forEach(email => {
            emailJobs.push({
              ...emailData,
              to: [email], // Single email for privacy
              isBulk: true,
              bulkType: 'csv'
            });
          });
        }
      } catch (error) {
        errors.push(`Error processing recipient: ${error.message}`);
      }
    }

    if (emailJobs.length === 0) {
      return res.status(400).json({ 
        message: 'No valid recipients found',
        errors 
      });
    }

    // Generate email body with the new production-ready template
    const emailBody = generateCyberThreatEmailTemplate(advisory, customMessage);

    // Initialize tracking if enabled
    let trackingRecords = [];
    console.log(`🔍 Tracking check: enableTracking=${trackingOptions.enableTracking}, userRole=${decoded.role}`);
    
    if (trackingOptions.enableTracking && decoded.role === 'super_admin') {
      console.log('📊 Initializing email tracking...');
      try {
        await dbConnect();
        const db = mongoose.connection.db;
        const trackingCollection = db.collection('emailTracking');

        console.log(`🔗 Database connection state: ${mongoose.connection.readyState}`);
        console.log(`🗄️ Database name: ${db.databaseName}`);

        for (const emailJob of emailJobs) {
          for (const email of emailJob.to) {
            const trackingId = crypto.randomUUID();
            const trackingRecord = {
              emailId: advisoryId,
              recipientEmail: email,
              trackingId,
              events: [],
              openCount: 0,
              createdAt: new Date(),
              trackingOptions
            };

            console.log(`🔄 Attempting to insert tracking record for: ${email}`);
            const insertResult = await trackingCollection.insertOne(trackingRecord);
            console.log(`✅ Insert result: ${insertResult.insertedId ? 'SUCCESS' : 'FAILED'} - ID: ${insertResult.insertedId}`);
            
            // Verify the record was actually saved
            const verifyRecord = await trackingCollection.findOne({ trackingId });
            console.log(`🔍 Verification: ${verifyRecord ? 'FOUND' : 'NOT FOUND'} in database`);
            
            trackingRecords.push({ email, trackingId });
            console.log(`📊 Tracking record created: ${email} -> ${trackingId}`);
          }
        }
        console.log(`✅ Created ${trackingRecords.length} tracking records`);
      } catch (error) {
        console.error('Failed to initialize tracking:', error);
        console.error('Error details:', error.stack);
        // Continue without tracking rather than failing the email
      }
    }

    // Schedule or send emails
    const scheduledEmails = [];
    let scheduledAt = new Date();

    if (isScheduled && scheduledDate && scheduledTime) {
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduleDateTime <= new Date()) {
        return res.status(400).json({ message: 'Scheduled time must be in the future' });
      }
      scheduledAt = scheduleDateTime;
    }

    await agenda.start();

    for (const emailJob of emailJobs) {
      try {
        // Add tracking IDs to email job if tracking is enabled
        if (trackingRecords.length > 0) {
          emailJob.trackingData = trackingRecords.filter(tr => 
            emailJob.to.includes(tr.email)
          );
          emailJob.enableTracking = true;
        }

        // Create scheduled email record
        const emailDoc = await ScheduledEmail.create({
          ...emailJob,
          scheduledDate: scheduledAt,
          sentAt: undefined, // Don't mark as sent until actually sent
          trackingEnabled: trackingOptions.enableTracking || false
        });

        if (isScheduled) {
          // Schedule the email for later
          await agenda.schedule(scheduledAt, 'send-scheduled-advisory-email', { 
            emailId: emailDoc._id 
          });
        } else {
          // Send immediately but still track it
          await agenda.now('send-scheduled-advisory-email', { 
            emailId: emailDoc._id 
          });
        }

        scheduledEmails.push({
          id: emailDoc._id,
          to: emailJob.to,
          clientName: emailJob.clientName || null
        });

      } catch (error) {
        errors.push(`Failed to schedule email for ${emailJob.to.join(', ')}: ${error.message}`);
      }
    }

    const response = {
      message: `Successfully ${isScheduled ? 'scheduled' : 'queued'} ${scheduledEmails.length} email(s)`,
      scheduledEmails,
      scheduledAt: isScheduled ? scheduledAt : null,
      errors: errors.length > 0 ? errors : undefined
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Send advisory email error:', error);
    res.status(500).json({ message: 'Failed to process email request' });
  }
}

// The generateEmailBody function is now replaced by the production-ready template
// No longer needed as we're using generateCyberThreatEmailTemplate from lib/emailTemplateGenerator.js
