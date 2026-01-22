/**
 * Google Apps Script Email Scheduler Utility
 * 
 * This module interfaces with Google Apps Script to schedule emails
 * that will be sent via native Gmail even when local server is offline
 */

// Use global fetch (available in Node 18+ and Next.js)
// No need to import node-fetch

class AppsScriptScheduler {
  constructor() {
    this.appsScriptUrl = process.env.APPS_SCRIPT_URL;
    
    // Check if URL is configured and not the placeholder
    if (!this.appsScriptUrl || this.appsScriptUrl.includes('YOUR_DEPLOYMENT_ID')) {
      this.appsScriptUrl = null;
      if (process.env.NODE_ENV !== 'production') {
        console.log('ℹ️ Google Apps Script not configured - using local Agenda.js scheduler');
        console.log('📖 To enable cloud-based scheduling, see: GOOGLE-APPS-SCRIPT-SETUP.md');
      }
    }
  }

  /**
   * Check if Apps Script scheduling is available
   */
  isAvailable() {
    return !!this.appsScriptUrl;
  }

  /**
   * Schedule an email via Google Apps Script
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Response with emailId and scheduledTime
   */
  async scheduleEmail(emailData) {
    if (!this.isAvailable()) {
      throw new Error('Apps Script URL not configured');
    }

    const {
      to,
      subject,
      htmlBody,
      scheduledTime,
      replyTo,
      cc,
      bcc,
      trackingId,
      advisoryId,
      clientId
    } = emailData;

    // Validate required fields
    if (!to || !subject || !htmlBody || !scheduledTime) {
      throw new Error('Missing required fields: to, subject, htmlBody, scheduledTime');
    }

    const payload = {
      action: 'schedule',
      to,
      subject,
      htmlBody,
      scheduledTime: new Date(scheduledTime).toISOString(),
      replyTo: replyTo || process.env.SMTP_USER,
      cc: cc || null,
      bcc: bcc || null,
      trackingId: trackingId || null,
      advisoryId: advisoryId || null,
      clientId: clientId || null
    };

    try {
      console.log('📤 Sending schedule request to Apps Script:', {
        to,
        scheduledTime: payload.scheduledTime,
        trackingId
      });

      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: 30000 // 30 seconds timeout
      });

      if (!response.ok) {
        // Provide more helpful error messages
        let errorMsg = `Apps Script returned status ${response.status}`;
        
        if (response.status === 401) {
          errorMsg = `Apps Script deployment requires authorization. Go to script.google.com → Deploy → Manage deployments → Edit → Set "Who has access" to "Anyone"`;
        } else if (response.status === 404) {
          errorMsg = `Apps Script URL not found. Verify your APPS_SCRIPT_URL in .env.local`;
        } else if (response.status === 403) {
          errorMsg = `Apps Script access forbidden. Check deployment permissions.`;
        }
        
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (!result.data || !result.data.success) {
        throw new Error(result.data?.error || 'Failed to schedule email');
      }

      console.log('Email scheduled successfully:', result.data.emailId);

      return {
        success: true,
        emailId: result.data.emailId,
        scheduledTime: result.data.scheduledTime
      };

    } catch (error) {
      console.error('❌ Failed to schedule email via Apps Script:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled email
   * @param {string} emailId - Apps Script email ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelEmail(emailId) {
    if (!this.isAvailable()) {
      throw new Error('Apps Script URL not configured');
    }

    if (!emailId) {
      throw new Error('emailId is required');
    }

    const payload = {
      action: 'cancel',
      emailId
    };

    try {
      console.log('🚫 Cancelling scheduled email:', emailId);

      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`Apps Script returned status ${response.status}`);
      }

      const result = await response.json();

      if (!result.data || !result.data.success) {
        throw new Error(result.data?.error || 'Failed to cancel email');
      }

      console.log('Email cancelled successfully');

      return {
        success: true,
        message: 'Email cancelled successfully'
      };

    } catch (error) {
      console.error('❌ Failed to cancel email:', error);
      throw error;
    }
  }

  /**
   * Check email status
   * @param {string} emailId - Apps Script email ID
   * @returns {Promise<Object>} Email status
   */
  async checkStatus(emailId) {
    if (!this.isAvailable()) {
      throw new Error('Apps Script URL not configured');
    }

    if (!emailId) {
      throw new Error('emailId is required');
    }

    const payload = {
      action: 'status',
      emailId
    };

    try {
      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`Apps Script returned status ${response.status}`);
      }

      const result = await response.json();

      if (!result.data || !result.data.success) {
        throw new Error(result.data?.error || 'Failed to check status');
      }

      return result.data.email;

    } catch (error) {
      console.error('❌ Failed to check email status:', error);
      throw error;
    }
  }

  /**
   * List all scheduled emails
   * @returns {Promise<Array>} List of scheduled emails
   */
  async listScheduledEmails() {
    if (!this.isAvailable()) {
      throw new Error('Apps Script URL not configured');
    }

    const payload = {
      action: 'list'
    };

    try {
      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`Apps Script returned status ${response.status}`);
      }

      const result = await response.json();

      if (!result.data || !result.data.success) {
        throw new Error(result.data?.error || 'Failed to list emails');
      }

      return result.data.emails;

    } catch (error) {
      console.error('❌ Failed to list scheduled emails:', error);
      throw error;
    }
  }

  /**
   * Health check - verify Apps Script is accessible
   * @returns {Promise<boolean>} True if Apps Script is online
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const response = await fetch(this.appsScriptUrl, {
        method: 'GET',
        timeout: 10000
      });

      if (response.ok) {
        const result = await response.json();
        return result.data?.status === 'online';
      }

      return false;

    } catch (error) {
      console.error('Apps Script health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new AppsScriptScheduler();
