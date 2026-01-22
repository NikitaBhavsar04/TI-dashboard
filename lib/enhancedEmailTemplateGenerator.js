// Enhanced Email Template Generator with Tracking
// File: lib/enhancedEmailTemplateGenerator.js

const EmailTrackingService = require('./emailTrackingService');

class EnhancedEmailTemplateGenerator {
  constructor(trackingService) {
    this.trackingService = trackingService;
  }

  /**
   * Generate tracked email template for threat advisory
   * @param {Object} templateData - Email template data
   * @returns {Promise<Object>} Email HTML and tracking info
   */
  async generateTrackedThreatAdvisory(templateData) {
    const {
      advisory,
      recipient,
      sender,
      customMessage,
      campaignId,
      trackingConfig = {}
    } = templateData;

    // Initialize tracking
    const tracking = await this.trackingService.initializeTracking({
      emailId: advisory._id.toString(),
      recipientEmail: recipient.email,
      senderEmail: sender.email,
      subject: advisory.title,
      campaignId,
      trackingConfig
    });

    // Generate email HTML with tracking
    const emailHtml = this.buildThreatAdvisoryTemplate({
      advisory,
      recipient,
      customMessage,
      tracking
    });

    return {
      html: emailHtml,
      trackingId: tracking.trackingId,
      pixelUrl: tracking.pixelUrl
    };
  }

  /**
   * Build threat advisory email template with embedded tracking
   */
  buildThreatAdvisoryTemplate({ advisory, recipient, customMessage, tracking }) {
    // Helper function to create tracked links
    const createTrackedLink = (url, linkText, linkId) => {
      if (!url || !tracking) {
        return `<a href="${url || '#'}" style="color: #3b82f6; text-decoration: none;">${linkText}</a>`;
      }
      
      const trackedUrl = tracking.trackLinkFunction(url, linkId);
      return `<a href="${trackedUrl}" style="color: #3b82f6; text-decoration: none;" rel="noopener noreferrer" target="_blank">${linkText}</a>`;
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>${advisory.title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Email client compatibility styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-container { background-color: #1a1a1a !important; }
            .content-section { background-color: #2d2d2d !important; color: #ffffff !important; }
        }
        
        /* Mobile responsive */
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; }
            .content-section { padding: 20px !important; }
            .threat-level { font-size: 14px !important; }
            h1 { font-size: 24px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
    
    <!-- Preheader text (hidden but appears in email client preview) -->
    <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; color: #0f172a;">
        ${advisory.title} - ${advisory.threatLevel.toUpperCase()} threat level advisory
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f172a;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main Email Container -->
                <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);">
                    
                    <!-- Header Section -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: rgba(255, 255, 255, 0.05);">
                            
                            <!-- Threat Level Badge -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <span class="threat-level" style="display: inline-block; background: ${this.getThreatLevelColor(advisory.threatLevel)}; color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
                                            🚨 ${advisory.threatLevel} THREAT LEVEL
                                        </span>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Advisory Title -->
                            <h1 style="color: #f1f5f9; font-size: 28px; font-weight: 700; margin: 0 0 20px 0; line-height: 1.3;">
                                ${advisory.title}
                            </h1>
                            
                            <!-- Advisory ID and Date -->
                            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                                Advisory ID: <strong>${advisory.advisoryId || 'N/A'}</strong> | 
                                ${new Date(advisory.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content Section -->
                    <tr>
                        <td class="content-section" style="padding: 40px; background: rgba(255, 255, 255, 0.03); color: #e2e8f0;">
                            
                            <!-- Personal Message (if provided) -->
                            ${customMessage ? `
                            <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                                <p style="margin: 0; color: #dbeafe; font-style: italic;">
                                    "${customMessage}"
                                </p>
                            </div>
                            ` : ''}
                            
                            <!-- Executive Summary -->
                            ${advisory.executiveSummary ? `
                            <h2 style="color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                Executive Summary
                            </h2>
                            <p style="color: #cbd5e1; line-height: 1.7; margin: 0 0 30px 0;">
                                ${advisory.executiveSummary}
                            </p>
                            ` : ''}
                            
                            <!-- Affected Products -->
                            ${advisory.affectedProducts && advisory.affectedProducts.length > 0 ? `
                            <h2 style="color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                ⚠️ Affected Products
                            </h2>
                            <ul style="color: #cbd5e1; line-height: 1.7; margin: 0 0 30px 20px; padding: 0;">
                                ${advisory.affectedProducts.map(product => `
                                    <li style="margin-bottom: 8px;">
                                        <strong>${product.name}</strong>
                                        ${product.version ? ` (Version: ${product.version})` : ''}
                                        ${product.description ? ` - ${product.description}` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                            ` : ''}
                            
                            <!-- Impact Assessment -->
                            ${advisory.impactAssessment ? `
                            <h2 style="color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                📊 Impact Assessment
                            </h2>
                            <p style="color: #cbd5e1; line-height: 1.7; margin: 0 0 30px 0;">
                                ${advisory.impactAssessment}
                            </p>
                            ` : ''}
                            
                            <!-- Recommendations -->
                            ${advisory.recommendations && advisory.recommendations.length > 0 ? `
                            <h2 style="color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                Recommended Actions
                            </h2>
                            <ol style="color: #cbd5e1; line-height: 1.7; margin: 0 0 30px 20px; padding: 0;">
                                ${advisory.recommendations.map(rec => `
                                    <li style="margin-bottom: 10px; padding-left: 5px;">
                                        ${rec}
                                    </li>
                                `).join('')}
                            </ol>
                            ` : ''}
                            
                            <!-- Technical Details (if available) -->
                            ${advisory.technicalDetails ? `
                            <h2 style="color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                🔧 Technical Details
                            </h2>
                            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin: 0 0 30px 0; border: 1px solid rgba(255, 255, 255, 0.1);">
                                <p style="color: #94a3b8; line-height: 1.6; margin: 0; font-family: 'Courier New', monospace; font-size: 13px;">
                                    ${advisory.technicalDetails}
                                </p>
                            </div>
                            ` : ''}
                            
                            <!-- References and Links -->
                            ${advisory.references && advisory.references.length > 0 ? `
                            <h2 style="color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
                                 References
                            </h2>
                            <ul style="color: #cbd5e1; line-height: 1.7; margin: 0 0 30px 20px; padding: 0;">
                                ${advisory.references.map((ref, index) => `
                                    <li style="margin-bottom: 8px;">
                                        ${createTrackedLink(ref.url || ref, ref.title || ref.name || ref, `ref_${index}`)}
                                    </li>
                                `).join('')}
                            </ul>
                            ` : ''}
                            
                        </td>
                    </tr>
                    
                    <!-- Action Section -->
                    <tr>
                        <td style="padding: 40px; background: rgba(59, 130, 246, 0.1); text-align: center;">
                            <h2 style="color: #f8fafc; font-size: 22px; font-weight: 600; margin: 0 0 20px 0;">
                                Take Action Now
                            </h2>
                            <p style="color: #cbd5e1; line-height: 1.6; margin: 0 0 30px 0;">
                                Review the full advisory details and implement the recommended security measures immediately.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        ${createTrackedLink(
                                            `/advisory/${advisory._id}`, 
                                            `<span style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #ffffff; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; text-decoration: none; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); text-align: center;">View Full Advisory</span>`,
                                            'main_cta'
                                        )}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.2); text-align: center;">
                            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                                This threat advisory was sent to: <strong style="color: #94a3b8;">${recipient.email}</strong>
                            </p>
                            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                                © ${new Date().getFullYear()} Threat Advisory System. All rights reserved.<br>
                                You received this because you're subscribed to security notifications.
                            </p>
                            
                            <!-- Unsubscribe link -->
                            <p style="margin: 15px 0 0 0;">
                                ${createTrackedLink(
                                    `/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${tracking.trackingId}`,
                                    '<span style="color: #64748b; font-size: 12px; text-decoration: underline;">Unsubscribe</span>',
                                    'unsubscribe'
                                )}
                            </p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
    
    <!-- Tracking Pixel (1x1 transparent image) -->
    ${tracking ? `<img src="${tracking.pixelUrl}" width="1" height="1" style="display: none !important; visibility: hidden !important; opacity: 0 !important; background: transparent !important; max-height: 0 !important; max-width: 0 !important; overflow: hidden !important;" alt="" />` : ''}
    
</body>
</html>`;
  }

  /**
   * Get color based on threat level
   */
  getThreatLevelColor(threatLevel) {
    const colors = {
      critical: '#dc2626', // Red
      high: '#ea580c',     // Orange  
      medium: '#d97706',   // Amber
      low: '#16a34a',      // Green
      info: '#0ea5e9'      // Blue
    };
    
    return colors[threatLevel?.toLowerCase()] || colors.info;
  }

  /**
   * Generate plain text version of the email
   */
  generatePlainTextVersion(advisory, recipient, customMessage) {
    return `
THREAT ADVISORY - ${advisory.threatLevel.toUpperCase()} LEVEL
${advisory.title}

Advisory ID: ${advisory.advisoryId || 'N/A'}
Date: ${new Date(advisory.createdAt).toLocaleDateString()}

${customMessage ? `Personal Message: "${customMessage}"\n\n` : ''}

${advisory.executiveSummary ? `EXECUTIVE SUMMARY:\n${advisory.executiveSummary}\n\n` : ''}

${advisory.affectedProducts && advisory.affectedProducts.length > 0 ? 
`AFFECTED PRODUCTS:\n${advisory.affectedProducts.map(p => `- ${p.name}${p.version ? ` (${p.version})` : ''}`).join('\n')}\n\n` : ''}

${advisory.impactAssessment ? `IMPACT ASSESSMENT:\n${advisory.impactAssessment}\n\n` : ''}

${advisory.recommendations && advisory.recommendations.length > 0 ? 
`RECOMMENDED ACTIONS:\n${advisory.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}\n\n` : ''}

${advisory.technicalDetails ? `TECHNICAL DETAILS:\n${advisory.technicalDetails}\n\n` : ''}

View full advisory: /advisory/${advisory._id}

---
This advisory was sent to: ${recipient.email}
© ${new Date().getFullYear()} Threat Advisory System
    `.trim();
  }
}

module.exports = EnhancedEmailTemplateGenerator;
