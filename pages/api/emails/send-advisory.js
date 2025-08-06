// pages/api/emails/send-advisory.js
import dbConnect from '../../../lib/db';
import Client from '../../../models/Client';
import Advisory from '../../../models/Advisory';
import ScheduledEmail from '../../../models/ScheduledEmail';
import { verifyToken } from '../../../lib/auth';
import nodemailer from 'nodemailer';

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
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      advisoryId,
      recipients, // Array of { type: 'client' | 'individual', id?: string, emails?: string[] }
      subject,
      customMessage,
      scheduledDate,
      scheduledTime,
      isScheduled = false
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

    // Generate email body with advisory content
    const emailBody = generateEmailBody(advisory, customMessage);

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
        // Create scheduled email record
        const emailDoc = await ScheduledEmail.create({
          ...emailJob,
          scheduledDate: scheduledAt,
          sentAt: undefined // Don't mark as sent until actually sent
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

function generateEmailBody(advisory, customMessage = '') {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Threat Advisory: ${advisory.title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .severity { 
            display: inline-block; 
            padding: 5px 10px; 
            border-radius: 4px; 
            color: white; 
            font-weight: bold; 
        }
        .critical { background: #dc2626; }
        .high { background: #ea580c; }
        .medium { background: #ca8a04; }
        .low { background: #2563eb; }
        .cve-list { background: #f3f4f6; padding: 10px; border-radius: 4px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚨 THREAT ADVISORY</h1>
        <h2>${advisory.title}</h2>
    </div>
    
    <div class="content">
        ${customMessage ? `
        <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
            <h3>Message from Security Team:</h3>
            <p>${customMessage.replace(/\n/g, '<br>')}</p>
        </div>
        ` : ''}
        
        <h3>Advisory Details</h3>
        <p><strong>Severity:</strong> 
            <span class="severity ${advisory.severity?.toLowerCase() || 'low'}">
                ${advisory.severity?.toUpperCase() || 'UNKNOWN'}
            </span>
        </p>
        
        ${advisory.category ? `<p><strong>Category:</strong> ${advisory.category}</p>` : ''}
        ${advisory.publishedDate ? `<p><strong>Published:</strong> ${new Date(advisory.publishedDate).toLocaleDateString()}</p>` : ''}
        
        ${advisory.executiveSummary || advisory.summary || advisory.description ? `
        <h3>Executive Summary</h3>
        <p>${advisory.executiveSummary || advisory.summary || advisory.description}</p>
        ` : ''}
        
        ${advisory.cveIds?.length || advisory.cves?.length ? `
        <h3>CVE Identifiers</h3>
        <div class="cve-list">
            ${(advisory.cveIds || advisory.cves || []).map(cve => `<span style="margin-right: 10px;">${cve}</span>`).join('')}
        </div>
        ` : ''}
        
        ${advisory.affectedProducts?.length ? `
        <h3>Affected Products</h3>
        <ul>
            ${advisory.affectedProducts.map(product => `<li>${product}</li>`).join('')}
        </ul>
        ` : ''}
        
        ${advisory.recommendations?.length ? `
        <h3>Recommendations</h3>
        <ul>
            ${advisory.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
        ` : ''}
        
        <div style="margin-top: 30px; padding: 15px; background: #f0f9ff; border-radius: 4px;">
            <p><strong>For detailed information, please visit:</strong></p>
            <p><a href="${baseUrl}/advisory/${advisory._id}" style="color: #2563eb;">
                ${baseUrl}/advisory/${advisory._id}
            </a></p>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>EaglEye IntelDesk - Threat Intelligence Platform</strong></p>
        <p>Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
        <p style="font-size: 12px; color: #6b7280;">
            This is an automated security advisory. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
  `.trim();
}
