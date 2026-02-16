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
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';

// Initialize OpenSearch client
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;
const port = process.env.OPENSEARCH_PORT || '9200';
const username = process.env.OPENSEARCH_USERNAME;
const password = process.env.OPENSEARCH_PASSWORD;

const nodeUrl = opensearchUrl || `https://${host}:${port}`;

const clientConfig = {
  node: nodeUrl,
  ssl: { rejectUnauthorized: false }
};

if (username && password) {
  clientConfig.auth = { username, password };
}

const osClient = new OpenSearchClient(clientConfig);
const ADVISORY_INDEX = 'ti-generated-advisories';

const { generateAdvisory4EmailTemplate } = require('../../../lib/advisory4TemplateGenerator');

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
      cc = [], // CC email addresses
      bcc = [], // BCC email addresses
      scheduledDate,
      scheduledTime,
      isScheduled = false,
      trackingOptions = { enableTracking: true }, // Default to enabled for super admins
      csvEmails = [], // For CSV bulk emails
      emailType = 'general', // 'general' or 'dedicated'
      ipSweepData // IOC detection data for dedicated advisories
    } = req.body;

    // Validation
    if (!advisoryId || !recipients || !recipients.length || !subject) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Load advisory from OpenSearch
    let advisory;
    
    try {
      console.log('[SEND-ADVISORY] Fetching advisory from OpenSearch:', advisoryId);
      
      // Fetch advisory from OpenSearch
      const response = await osClient.get({
        index: ADVISORY_INDEX,
        id: advisoryId
      });

      if (!response.body._source) {
        return res.status(404).json({ message: 'Advisory not found in OpenSearch' });
      }

      const advisoryData = response.body._source;
      console.log('[SEND-ADVISORY] Advisory loaded from OpenSearch');
      
      // Use OpenSearch data - template generator will handle all field name variations
      advisory = {
        ...advisoryData,
        _id: advisoryId
      };
      
      console.log('📧 Will generate HTML template dynamically from OpenSearch data');
      
    } catch (err) {
      console.error('[SEND-ADVISORY] Error fetching advisory from OpenSearch:', err);
      return res.status(500).json({ 
        message: 'Failed to load advisory from OpenSearch',
        error: err.message 
      });
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
          cc: cc || [],
          bcc: bcc || []
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

          console.log(`📧 [CLIENT DATA] MongoDB _id: ${client._id}`);
          console.log(`📧 [CLIENT DATA] client_id: ${client.client_id}`);
          console.log(`📧 [CLIENT DATA] client_name: ${client.client_name}`);
          console.log(`📧 [CLIENT DATA] name: ${client.name}`);

          // Combine client's configured CC/BCC with manual overrides
          const clientCcEmails = client.cc_emails || [];
          const clientBccEmails = client.bcc_emails || [];
          
          const combinedCc = [...new Set([...(cc || []), ...clientCcEmails])];
          const combinedBcc = [...new Set([...(bcc || []), ...clientBccEmails])];

          emailData = {
            ...emailData,
            to: client.emails,
            cc: combinedCc,
            bcc: combinedBcc
          };

          emailJobs.push({
            ...emailData,
            clientName: client.name,
            clientId: client.client_id // Add client_id for matching with IOC detection data
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

    // Generate email body dynamically from OpenSearch data
    console.log('📧 Generating HTML template from OpenSearch advisory data');
    console.log('📧 Email type:', emailType);
    console.log('📧 IP Sweep Data:', JSON.stringify(ipSweepData, null, 2));

    // For dedicated advisories, we'll generate individual emails per client with their specific IOC detection data
    // For general advisories, generate one email body for all recipients
    const emailBodies = {};

    if (emailType === 'dedicated' && ipSweepData && ipSweepData.impacted_clients) {
      console.log('📧 Generating dedicated advisory emails with IOC detection data');
      console.log('📧 Number of impacted clients:', ipSweepData.impacted_clients.length);

      // Generate separate email for each affected client
      for (const impactedClient of ipSweepData.impacted_clients) {
        const clientIocData = {
          client_name: impactedClient.client_name,
          checked_at: ipSweepData.checked_at,
          match_count: impactedClient.matches.length,
          matches: impactedClient.matches
        };

        console.log(`📧 Generating email for client: ${impactedClient.client_id} (${impactedClient.client_name})`);
        console.log(`📧 IOC Data for client:`, JSON.stringify(clientIocData, null, 2));

        emailBodies[impactedClient.client_id] = generateAdvisory4EmailTemplate(
          advisory,
          customMessage,
          clientIocData
        );

        console.log(`📧 Email body generated for client ${impactedClient.client_id}, contains IOC section: ${emailBodies[impactedClient.client_id].includes('IOC DETECTION ALERT')}`);
      }

      console.log('📧 Email bodies keys:', Object.keys(emailBodies));

      // Verify each generated body
      Object.keys(emailBodies).forEach(key => {
        if (key !== 'general') {
          const hasIoc = emailBodies[key].includes('IOC DETECTION ALERT');
          console.log(`📧 [VERIFICATION] emailBodies['${key}'] contains IOC section: ${hasIoc}`);
          if (!hasIoc) {
            console.error(`❌ [ERROR] Generated body for client '${key}' is missing IOC section!`);
          }
        }
      });
    } else {
      console.log('📧 Generating general advisory email');
      // General advisory - no IOC detection data
      emailBodies['general'] = generateAdvisory4EmailTemplate(advisory, customMessage);
    }

    console.log('📧 [FINAL CHECK] Total email bodies generated:', Object.keys(emailBodies).length);
    console.log('📧 [FINAL CHECK] Email bodies keys:', Object.keys(emailBodies));

    // Initialize tracking if enabled
    let trackingRecords = [];
    console.log(`🔍 Tracking check: enableTracking=${trackingOptions.enableTracking}, userRole=${decoded.role}`);
    
    if (trackingOptions.enableTracking && decoded.role === 'super_admin') {
      console.log('📊 Initializing email tracking...');
      try {
        await dbConnect();
        const db = mongoose.connection.db;
        const trackingCollection = db.collection('emailTracking');

        console.log(` Database connection state: ${mongoose.connection.readyState}`);
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
            console.log(`Insert result: ${insertResult.insertedId ? 'SUCCESS' : 'FAILED'} - ID: ${insertResult.insertedId}`);
            
            // Verify the record was actually saved
            const verifyRecord = await trackingCollection.findOne({ trackingId });
            console.log(`🔍 Verification: ${verifyRecord ? 'FOUND' : 'NOT FOUND'} in database`);
            
            trackingRecords.push({ email, trackingId });
            console.log(`📊 Tracking record created: ${email} -> ${trackingId}`);
          }
        }
        console.log(`Created ${trackingRecords.length} tracking records`);
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
      // Create datetime string and interpret as user's timezone (IST)
      // Then convert to UTC for storage and scheduling
      const dateTimeString = `${scheduledDate}T${scheduledTime}`;
      const scheduleDateTime = new Date(dateTimeString);
      
      // Check if the time is valid
      if (isNaN(scheduleDateTime.getTime())) {
        return res.status(400).json({ message: 'Invalid date or time format' });
      }
      
      // Add timezone offset for IST (UTC+05:30) to ensure proper conversion
      // This ensures the user's intended time is preserved
      const userTimezone = 'Asia/Kolkata'; // Indian Standard Time
      const now = new Date();
      
      // Convert to IST timezone for comparison
      const scheduleInIST = new Date(dateTimeString);
      const nowInIST = new Date(now.toLocaleString("en-US", {timeZone: userTimezone}));
      
      if (scheduleInIST <= nowInIST) {
        return res.status(400).json({ message: 'Scheduled time must be in the future (IST)' });
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
          // Add tracking IDs to email job if tracking is enabled
          if (trackingRecords.length > 0) {
            emailJob.trackingData = trackingRecords.filter(tr =>
              emailJob.to.includes(tr.email)
            );
            emailJob.enableTracking = true;
          }

          // Select appropriate email body based on email type and client
          let jobBody;

          console.log(`📧 [EMAIL JOB] Processing email for client: ${emailJob.clientName}`);
          console.log(`📧 [EMAIL JOB] clientId: ${emailJob.clientId}`);
          console.log(`📧 [EMAIL JOB] emailType: ${emailType}`);
          console.log(`📧 [EMAIL BODIES] Available keys: ${Object.keys(emailBodies).join(', ')}`);

          if (emailType === 'dedicated' && emailJob.clientId) {
            // Try exact clientId match
            if (emailBodies[emailJob.clientId]) {
              jobBody = emailBodies[emailJob.clientId];
              console.log(`✅ Using dedicated email body for client ID: ${emailJob.clientId}`);
            } else {
              // Fallback: Try to find by client name
              const bodyKey = Object.keys(emailBodies).find(key => {
                if (key === 'general') return false;
                // Try to match with impacted clients by name
                const impactedClient = ipSweepData?.impacted_clients?.find(
                  ic => ic.client_id === key || ic.client_name === emailJob.clientName
                );
                return !!impactedClient;
              });

              if (bodyKey && bodyKey !== 'general') {
                jobBody = emailBodies[bodyKey];
                console.log(`✅ Using dedicated email body via fallback match (key: ${bodyKey})`);
              } else if (emailBodies['general']) {
                jobBody = emailBodies['general'];
                console.log(`⚠️ No dedicated match found, using pre-generated general body`);
              } else {
                // FALLBACK: Generate a fresh standard advisory body for this client
                // This handles manually added clients who weren't in the IP sweep results
                console.log(`⚠️ Generating new standard advisory body for manual client "${emailJob.clientName}" (not in IP sweep results)`);
                jobBody = generateAdvisory4EmailTemplate(advisory, customMessage);
              }
            }
          } else {
            // General email type or no client ID
            if (emailBodies['general']) {
                jobBody = emailBodies['general'];
            } else {
                 console.log(`⚠️ General body missing, generating now`);
                 jobBody = generateAdvisory4EmailTemplate(advisory, customMessage);
            }
            console.log(`📧 Using general email body (emailType: ${emailType})`);
          }

          if (!jobBody) {
             console.error(`❌ CRITICAL: Failed to generate email body for ${emailJob.clientName}`);
             // Emergency fallback
             jobBody = generateAdvisory4EmailTemplate(advisory, customMessage);
          }

          // Verify the body contains IOC section if it should
          const hasIocSection = jobBody.includes('IOC DETECTION ALERT');
          console.log(`📧 [VERIFICATION] Email body contains IOC section: ${hasIocSection}`);
          if (emailType === 'dedicated' && !hasIocSection) {
            console.error(`❌ [ERROR] Dedicated email should have IOC section but doesn't!`);
          }

          // Inject tracking pixel if tracking is enabled and trackingId is available
          if (emailJob.enableTracking && emailJob.trackingData && emailJob.trackingData.length > 0) {
            // Use the first trackingId for this recipient (should be only one per recipient)
            const trackingId = emailJob.trackingData[0].trackingId;
            // TODO: Replace with your actual domain or endpoint
            const trackingPixelUrl = `https://your-domain.com/api/track?tid=${trackingId}`;
            const trackingPixel = `<img src=\"${trackingPixelUrl}\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />`;
            // Try to inject before </body> or at the end
            if (jobBody.includes('</body>')) {
              jobBody = jobBody.replace(/<\/body>/i, `${trackingPixel}</body>`);
            } else {
              jobBody += trackingPixel;
            }
          }
          emailJob.body = jobBody;

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

              // Prepare CC and BCC for Apps Script
              const ccEmails = emailJob.cc && emailJob.cc.length > 0 
                ? (Array.isArray(emailJob.cc) ? emailJob.cc.join(', ') : emailJob.cc)
                : null;
              const bccEmails = emailJob.bcc && emailJob.bcc.length > 0 
                ? (Array.isArray(emailJob.bcc) ? emailJob.bcc.join(', ') : emailJob.bcc)
                : null;

              const appsScriptResult = await appsScriptScheduler.scheduleEmail({
                to: toEmails,
                subject: emailJob.subject,
                htmlBody: emailJob.body,
                scheduledTime: scheduledAt.toISOString(),
                replyTo: process.env.SMTP_USER,
                cc: ccEmails,
                bcc: bccEmails,
                trackingId: emailJob.trackingData?.[0]?.trackingId,
                advisoryId: advisoryId,
                clientId: emailJob.clientId
              });

              // Store Apps Script email ID
              emailDoc.appsScriptEmailId = appsScriptResult.emailId;
              await emailDoc.save();

              console.log(`Scheduled via Apps Script: ${appsScriptResult.emailId}`);

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
