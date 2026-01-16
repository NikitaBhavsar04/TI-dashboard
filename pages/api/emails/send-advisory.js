// pages/api/emails/send-advisory.js
import dbConnect from '../../../lib/db';
import Client from '../../../models/Client';
import Advisory from '../../../models/Advisory';
import ScheduledEmail from '../../../models/ScheduledEmail';
import { verifyToken } from '../../../lib/auth';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const { generateAdvisory4EmailTemplate } = require('../../../lib/advisory4TemplateGenerator');

// Helper function to read workspace HTML file
function readWorkspaceHTML(htmlFileName) {
  try {
    if (!htmlFileName) return null;
    
    const workspacePath = path.resolve(process.cwd(), 'backend', 'workspace', htmlFileName);
    const workspaceRoot = path.resolve(process.cwd(), 'backend', 'workspace');
    
    // Security check
    if (!workspacePath.startsWith(workspaceRoot)) {
      console.error('Security violation: Path outside workspace');
      return null;
    }
    
    if (!fs.existsSync(workspacePath)) {
      console.error(`HTML file not found: ${workspacePath}`);
      return null;
    }
    
    const htmlContent = fs.readFileSync(workspacePath, 'utf8');
    console.log(`✅ Successfully read workspace HTML file: ${htmlFileName}`);
    return htmlContent;
  } catch (error) {
    console.error(`Error reading workspace HTML file:`, error);
    return null;
  }
}

const { agenda } = require('../../../lib/agenda');
const appsScriptScheduler = require('../../../lib/appsScriptScheduler');

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

    // Detect if this is an Eagle Nest advisory (custom ID format) or Intel Feed (MongoDB ObjectId)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(advisoryId);
    let advisory;
    
    if (isValidObjectId) {
      // Intel Feed advisory - load from MongoDB
      advisory = await Advisory.findById(advisoryId);
      if (!advisory) {
        return res.status(404).json({ message: 'Advisory not found' });
      }
    } else {
      // Eagle Nest advisory - load from JSON file
      const fs = require('fs');
      const path = require('path');
      const eagleNestPath = path.resolve(process.cwd(), 'backend', 'workspace', 'eagle_nest', `${advisoryId}.json`);
      
      if (!fs.existsSync(eagleNestPath)) {
        return res.status(404).json({ message: 'Eagle Nest advisory not found' });
      }
      
      try {
        const eagleNestData = JSON.parse(fs.readFileSync(eagleNestPath, 'utf8'));
        
        // Check if HTML file exists in backend/workspace/ or backend/workspace/email_cache/
        let htmlFileName = null;
        const workspacePath = path.resolve(process.cwd(), 'backend', 'workspace');
        const emailCachePath = path.resolve(process.cwd(), 'backend', 'workspace', 'email_cache');
        
        // Search in workspace root first
        let htmlFiles = fs.readdirSync(workspacePath).filter(f => f.startsWith(advisoryId) && f.endsWith('.html'));
        
        if (htmlFiles.length === 0 && fs.existsSync(emailCachePath)) {
          // Search in email_cache folder
          htmlFiles = fs.readdirSync(emailCachePath).filter(f => f.startsWith(advisoryId) && f.endsWith('.html'));
          if (htmlFiles.length > 0) {
            htmlFileName = `email_cache/${htmlFiles[0]}`; // Include subfolder path
            console.log(`📧 Found Eagle Nest HTML file in cache: ${htmlFileName}`);
          }
        } else if (htmlFiles.length > 0) {
          htmlFileName = htmlFiles[0]; // Use the first matching HTML file
          console.log(`📧 Found Eagle Nest HTML file: ${htmlFileName}`);
        }
        
        // Use raw Eagle Nest data - template generator handles all field name variations
        advisory = {
          ...eagleNestData, // Spread all original fields
          _id: advisoryId, // Ensure _id is set
          htmlFileName: htmlFileName // Add HTML filename if found
        };
      } catch (err) {
        console.error('Error parsing Eagle Nest advisory:', err);
        return res.status(500).json({ message: 'Failed to load Eagle Nest advisory' });
      }
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

    // Generate email body - prioritize workspace HTML file if available
    let emailBody;
    
    if (advisory.htmlFileName) {
      console.log(`📧 Attempting to use workspace HTML file: ${advisory.htmlFileName}`);
      const workspaceHTML = readWorkspaceHTML(advisory.htmlFileName);
      
      if (workspaceHTML) {
        // If custom message is provided, inject it into the HTML
        if (customMessage) {
          // Insert custom message after the header section
          const customMessageHTML = `
            <tr>
              <td style="padding: 20px 30px; background-color: rgba(5, 150, 105, 0.8);">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #ffffff;">📢 Message from Security Team</h3>
                <p style="margin: 0; font-size: 14px; color: #ecfdf5; line-height: 1.5;">${customMessage.replace(/\n/g, '<br>')}</p>
              </td>
            </tr>
          `;
          // Try to inject after the first closing </tr> tag or at the beginning of body
          emailBody = workspaceHTML.replace(/(<\/tr>)/, `$1${customMessageHTML}`);
        } else {
          emailBody = workspaceHTML;
        }
        console.log(`✅ Using workspace HTML file for email body`);
      } else {
        console.log(`⚠️ Workspace HTML file not found, falling back to advisory_4 template`);
        emailBody = generateAdvisory4EmailTemplate(advisory, customMessage);
      }
    } else {
      console.log(`📧 No workspace HTML file specified, using advisory_4 template`);
      emailBody = generateAdvisory4EmailTemplate(advisory, customMessage);
    }

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
    const useAppsScript = appsScriptScheduler.isAvailable() && isScheduled;

    if (isScheduled && scheduledDate && scheduledTime) {
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduleDateTime <= new Date()) {
        return res.status(400).json({ message: 'Scheduled time must be in the future' });
      }
      scheduledAt = scheduleDateTime;
    }

    // Decide scheduling method
    if (useAppsScript) {
      console.log('📧 Using Google Apps Script for scheduling (cloud-based, 24/7)');
    } else if (isScheduled) {
      console.log('⏰ Using local Agenda.js for scheduling (requires server running)');
      await agenda.start();
    } else {
      console.log('⚡ Sending emails immediately via Agenda.js');
      await agenda.start();
    }

    for (const emailJob of emailJobs) {
      try {
        // Add email body to each job
        emailJob.body = emailBody;
        
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
          trackingEnabled: trackingOptions.enableTracking || false,
          schedulingMethod: useAppsScript ? 'apps-script' : 'agenda'
        });

        if (useAppsScript) {
          // Use Google Apps Script for reliable cloud-based scheduling
          try {
            // Ensure all required fields are present
            const toEmails = Array.isArray(emailJob.to) ? emailJob.to.join(', ') : emailJob.to;
            
            if (!toEmails || !emailJob.subject || !emailJob.body) {
              throw new Error('Missing required email fields');
            }

            console.log(`📤 Scheduling via Apps Script for: ${toEmails}`);

            const appsScriptResult = await appsScriptScheduler.scheduleEmail({
              to: toEmails,
              subject: emailJob.subject,
              htmlBody: emailJob.body,
              scheduledTime: scheduledAt.toISOString(),
              replyTo: process.env.SMTP_USER,
              trackingId: emailJob.trackingData?.[0]?.trackingId,
              advisoryId: advisoryId,
              clientId: emailJob.clientId
            });

            // Store Apps Script email ID
            emailDoc.appsScriptEmailId = appsScriptResult.emailId;
            await emailDoc.save();

            console.log(`✅ Scheduled via Apps Script: ${appsScriptResult.emailId}`);

          } catch (appsScriptError) {
            console.error('❌ Apps Script scheduling failed, using Agenda.js instead:', appsScriptError.message);
            // Fallback to Agenda.js
            if (!agenda._ready) await agenda.start();
            await agenda.schedule(scheduledAt, 'send-scheduled-advisory-email', { 
              emailId: emailDoc._id 
            });
            emailDoc.schedulingMethod = 'agenda-fallback';
            await emailDoc.save();
          }

        } else if (isScheduled) {
          // Schedule the email for later using Agenda.js
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
          clientName: emailJob.clientName || null,
          method: useAppsScript ? 'apps-script' : 'agenda'
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
