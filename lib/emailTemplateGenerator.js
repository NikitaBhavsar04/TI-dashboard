// Production-ready HTML email template generator for Cyber Threat Advisory
// Fully responsive with inline CSS for maximum email client compatibility

// Generate dashboard-style HTML email (matches dashboard preview)
export function generateDashboardStyleEmailTemplate(advisory, customMessage = '', trackingData = null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
  
  // Helper function to create tracked links
  const createTrackedLink = (url, linkText, linkId) => {
    if (!url) return linkText;
    
    if (trackingData && trackingData.trackingId) {
      const encodedUrl = encodeURIComponent(url);
      const linkParam = linkId ? `&l=${encodeURIComponent(linkId)}` : '';
      const trackedUrl = `/api/track/link?t=${trackingData.trackingId}&u=${encodedUrl}${linkParam}&r=${Math.random().toString(36).substring(7)}`;
      return `<a href="${baseUrl}${trackedUrl}" style="color: #06b6d4; text-decoration: none;" rel="noopener noreferrer" target="_blank">${linkText}</a>`;
    } else {
      return `<a href="${url}" style="color: #06b6d4; text-decoration: none;" rel="noopener noreferrer" target="_blank">${linkText}</a>`;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Severity colors
  const getSeverityColor = (severity) => {
    const level = severity?.toLowerCase();
    if (level === 'critical') return { bg: '#dc2626', text: '#fecaca', border: '#ef4444' };
    if (level === 'high') return { bg: '#ea580c', text: '#fed7aa', border: '#f97316' };
    if (level === 'medium') return { bg: '#eab308', text: '#fef08a', border: '#facc15' };
    return { bg: '#3b82f6', text: '#bfdbfe', border: '#60a5fa' };
  };

  const severityColor = getSeverityColor(advisory.severity);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${advisory.title || 'Threat Advisory'}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e2e8f0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            padding: 30px;
            text-align: center;
            border-radius: 12px 12px 0 0;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
            color: #ffffff;
        }
        .header h2 {
            margin: 0 0 5px 0;
            font-size: 18px;
            color: rgba(255, 255, 255, 0.95);
        }
        .badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
            margin: 10px 5px;
            text-transform: uppercase;
        }
        .severity-badge {
            background: ${severityColor.bg};
            color: #ffffff;
            border: 1px solid ${severityColor.border};
        }
        .content {
            background: rgba(15, 23, 42, 0.95);
            padding: 30px;
            border-radius: 0 0 12px 12px;
        }
        .custom-message {
            background: rgba(5, 150, 105, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.5);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .section {
            background: rgba(51, 65, 85, 0.5);
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #60a5fa;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .section-subtitle {
            font-size: 16px;
            font-weight: 600;
            color: #ffffff;
            margin: 15px 0 10px 0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }
        .info-item label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            display: block;
            margin-bottom: 5px;
        }
        .info-item value {
            font-size: 14px;
            color: #ffffff;
            font-weight: 500;
        }
        .tag {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            margin: 3px;
        }
        .tag-sector {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        .tag-product {
            background: linear-gradient(135deg, #7c3aed, #6d28d9);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        table th {
            background: rgba(75, 85, 99, 0.5);
            padding: 10px;
            border: 1px solid rgba(107, 114, 128, 0.3);
            font-size: 12px;
            color: #ffffff;
            text-transform: uppercase;
            text-align: left;
        }
        table td {
            padding: 10px;
            border: 1px solid rgba(107, 114, 128, 0.3);
            font-size: 13px;
            color: rgba(255, 255, 255, 0.9);
        }
        .recommendation {
            background: linear-gradient(135deg, #1e40af, #1d4ed8);
            border-radius: 8px;
            padding: 12px 12px 12px 40px;
            margin-bottom: 10px;
            position: relative;
            color: #ffffff;
            font-size: 14px;
        }
        .recommendation-number {
            position: absolute;
            left: 12px;
            top: 12px;
            width: 20px;
            height: 20px;
            background: #fbbf24;
            color: #000000;
            border-radius: 50%;
            font-weight: 700;
            font-size: 12px;
            text-align: center;
            line-height: 20px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: #fbbf24;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
        }
        @media only screen and (max-width: 600px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🛡️ CYBER THREAT ADVISORY</h1>
            <h2>${advisory.title || 'Untitled Advisory'}</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">Critical Security Intelligence Alert</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Badges -->
            ${advisory.severity ? `<span class="badge severity-badge">🚨 ${advisory.severity.toUpperCase()}</span>` : ''}
            ${advisory.tlp || advisory.tlpClassification ? `<span class="badge" style="background: rgba(148, 163, 184, 0.3); color: #ffffff; border: 1px solid rgba(148, 163, 184, 0.5);">🔒 TLP: ${(advisory.tlp || advisory.tlpClassification).toUpperCase()}</span>` : ''}

            <!-- Custom Message -->
            ${customMessage ? `
            <div class="custom-message">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #ffffff;">📢 Message from Security Team</h3>
                <p style="margin: 0; color: #ecfdf5; line-height: 1.5;">${customMessage.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}

            <!-- Executive Summary -->
            ${advisory.executiveSummary || advisory.summary || advisory.description ? `
            <div class="section">
                <div class="section-title">📊 Executive Summary</div>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">
                    ${advisory.executiveSummary || advisory.summary || advisory.description}
                </p>
            </div>
            ` : ''}

            <!-- Threat Parameters -->
            <div class="section">
                <div class="section-title">🚨 Threat Parameters</div>
                <div class="info-grid">
                    ${advisory.category ? `
                    <div class="info-item">
                        <label>Category</label>
                        <value>${advisory.category}</value>
                    </div>
                    ` : ''}
                    ${advisory.publishedDate ? `
                    <div class="info-item">
                        <label>Published</label>
                        <value>${formatDate(advisory.publishedDate)}</value>
                    </div>
                    ` : ''}
                    ${advisory.author ? `
                    <div class="info-item">
                        <label>Analyst</label>
                        <value>${advisory.author}</value>
                    </div>
                    ` : ''}
                    ${advisory.cvss ? `
                    <div class="info-item">
                        <label>CVSS Score</label>
                        <value>${advisory.cvss}</value>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Affected Systems -->
            ${(advisory.cveIds?.length || advisory.cves?.length || advisory.targetSectors?.length || advisory.affectedProducts?.length) ? `
            <div class="section">
                <div class="section-title">🎯 Affected Systems</div>
                
                ${(advisory.cveIds?.length || advisory.cves?.length) ? `
                <div class="section-subtitle">CVE IDs</div>
                <div>
                    ${(advisory.cveIds || advisory.cves || []).map(cve => 
                        `<span class="tag">${cve}</span>`
                    ).join('')}
                </div>
                ` : ''}
                
                ${advisory.targetSectors?.length ? `
                <div class="section-subtitle">Target Sectors</div>
                <div>
                    ${advisory.targetSectors.map(sector => 
                        `<span class="tag tag-sector">${sector}</span>`
                    ).join('')}
                </div>
                ` : ''}
                
                ${advisory.affectedProducts?.length ? `
                <div class="section-subtitle">Affected Products</div>
                <div>
                    ${advisory.affectedProducts.map(product => 
                        `<span class="tag tag-product">${product}</span>`
                    ).join('')}
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- MITRE ATT&CK -->
            ${advisory.mitreTactics?.length && advisory.mitreTactics.some(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)) ? `
            <div class="section">
                <div class="section-title">🛡️ MITRE ATT&CK Framework</div>
                <table>
                    <tr>
                        <th>Tactic</th>
                        <th>ID</th>
                        <th>Technique</th>
                    </tr>
                    ${advisory.mitreTactics.filter(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)).map(tactic => 
                        `<tr>
                            <td style="font-weight: 600;">${tactic.name || tactic.tacticName || 'Unknown'}</td>
                            <td style="color: #fbbf24; font-family: monospace;">${tactic.id || tactic.techniqueId || 'N/A'}</td>
                            <td>${tactic.technique || tactic.name || 'No description available'}</td>
                        </tr>`
                    ).join('')}
                </table>
            </div>
            ` : ''}

            <!-- IOCs -->
            ${advisory.iocs?.length ? `
            <div class="section">
                <div class="section-title">🧠 Indicators of Compromise</div>
                <table>
                    <tr>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Description</th>
                    </tr>
                    ${advisory.iocs.map(ioc => 
                        `<tr>
                            <td>${ioc.type}</td>
                            <td style="font-family: monospace; word-break: break-all;">${ioc.value}</td>
                            <td>${ioc.description || 'N/A'}</td>
                        </tr>`
                    ).join('')}
                </table>
            </div>
            ` : ''}

            <!-- Recommendations -->
            ${advisory.recommendations?.length ? `
            <div class="section">
                <div class="section-title">✅ Security Recommendations</div>
                ${advisory.recommendations.map((rec, index) => 
                    `<div class="recommendation">
                        <div class="recommendation-number">${index + 1}</div>
                        ${rec}
                    </div>`
                ).join('')}
            </div>
            ` : ''}

            <!-- Patch Details -->
            ${advisory.patchDetails ? `
            <div class="section">
                <div class="section-title">🧩 Patch Details</div>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.9); line-height: 1.6; white-space: pre-wrap;">
                    ${advisory.patchDetails}
                </p>
            </div>
            ` : ''}

            <!-- References -->
            ${advisory.references?.length ? `
            <div class="section">
                <div class="section-title">📦 External References</div>
                <ul style="margin: 0; padding-left: 20px;">
                    ${advisory.references.map(ref => 
                        `<li style="margin-bottom: 8px;">
                            <a href="${ref}" style="color: #06b6d4; word-break: break-all;" target="_blank">${ref}</a>
                        </li>`
                    ).join('')}
                </ul>
            </div>
            ` : ''}

            <!-- CTA -->
            <div style="text-align: center; padding: 20px 0;">
                ${createTrackedLink(`${baseUrl}/advisory/${advisory._id}`, 
                    `<span class="cta-button">📄 View Full Report</span>`, 
                    'main_cta')}
            </div>

            <!-- Footer -->
            <div class="footer">
                <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #ffffff;">🦅 EaglEye IntelDesk</h4>
                <p style="margin: 0 0 5px 0; font-size: 14px; color: #60a5fa;">Threat Intelligence Platform</p>
                <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.6);">🔬 Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
                <p style="margin: 10px 0 0 0; font-style: italic;">
                    🤖 This is an automated security advisory from your threat intelligence system.<br>
                    📧 Please do not reply to this email. For support, contact your security team.
                </p>
            </div>
        </div>
    </div>

    ${trackingData ? `<!-- Email Tracking Pixel -->
    <img src="${baseUrl}/api/emails/tracking?t=${trackingData.trackingId}&type=open" width="1" height="1" style="display:none;" alt="" />` : ''}
</body>
</html>`;
}

export function generateCyberThreatEmailTemplate(advisory, customMessage = '', trackingData = null) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inteldesk.eagleyesoc.ai';
  
  // Helper function to create tracked links
  const createTrackedLink = (url, linkText, linkId) => {
    if (!url) return linkText;
    
    if (trackingData && trackingData.trackingId) {
      const encodedUrl = encodeURIComponent(url);
      const linkParam = linkId ? `&l=${encodeURIComponent(linkId)}` : '';
      const trackedUrl = `/api/track/link?t=${trackingData.trackingId}&u=${encodedUrl}${linkParam}&r=${Math.random().toString(36).substring(7)}`;
      return `<a href="${baseUrl}${trackedUrl}" style="color: #fbbf24; text-decoration: none;" rel="noopener noreferrer" target="_blank">${linkText}</a>`;
    } else {
      return `<a href="${url}" style="color: #fbbf24; text-decoration: none;" rel="noopener noreferrer" target="_blank">${linkText}</a>`;
    }
  };
  
  // TLP Color mapping with neon glass effects
  const tlpColors = {
    'clear': { bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', text: '#1e293b', glow: 'rgba(148, 163, 184, 0.4)' },
    'white': { bg: 'linear-gradient(135deg, #ffffff, #f1f5f9)', text: '#1e293b', glow: 'rgba(148, 163, 184, 0.4)' },
    'green': { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', text: '#ffffff', glow: 'rgba(34, 197, 94, 0.4)' },
    'amber': { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '#ffffff', glow: 'rgba(245, 158, 11, 0.4)' },
    'yellow': { bg: 'linear-gradient(135deg, #eab308, #ca8a04)', text: '#ffffff', glow: 'rgba(234, 179, 8, 0.4)' },
    'red': { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.4)' }
  };
  
  const severityColors = {
    'critical': { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', glow: 'rgba(239, 68, 68, 0.4)' },
    'high': { bg: 'linear-gradient(135deg, #ea580c, #c2410c)', glow: 'rgba(234, 88, 12, 0.4)' },
    'medium': { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', glow: 'rgba(245, 158, 11, 0.4)' },
    'low': { bg: 'linear-gradient(135deg, #10b981, #059669)', glow: 'rgba(16, 185, 129, 0.4)' },
    'info': { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', glow: 'rgba(59, 130, 246, 0.4)' }
  };
  
  const tlpColor = tlpColors[advisory.tlp?.toLowerCase()] || tlpColors.clear;
  const severityColor = severityColors[advisory.severity?.toLowerCase()] || severityColors.info;
  
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Cyber Threat Advisory: ${advisory.title || 'Untitled'}</title>
    
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
        /* Reset and base styles for email clients */
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            width: 100% !important;
            background: #0a0a0a !important;
        }
        
        * {
            -ms-text-size-adjust: 100%;
            -webkit-text-size-adjust: 100%;
        }
        
        div[style*="margin: 16px 0"] {
            margin: 0 !important;
        }
        
        table, td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
        }
        
        table {
            border-spacing: 0 !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            margin: 0 auto !important;
        }
        
        img {
            -ms-interpolation-mode: bicubic;
            max-width: 100%;
            height: auto;
        }
        
        a {
            text-decoration: none;
        }
        
        /* Desktop optimizations */
        @media only screen and (min-width: 600px) {
            .desktop-visible {
                display: block !important;
            }
            
            .desktop-table {
                display: table !important;
            }
            
            .desktop-table-cell {
                display: table-cell !important;
                vertical-align: top !important;
            }
            
            .desktop-width-50 {
                width: 48% !important;
            }
            
            .desktop-spacer {
                width: 4% !important;
            }
            
            .desktop-font-lg {
                font-size: 34px !important;
                line-height: 1.2 !important;
            }
            
            .desktop-font-md {
                font-size: 20px !important;
                line-height: 1.4 !important;
            }
        }
        
        /* Mobile-first responsive styles */
        @media only screen and (max-width: 599px) {
            .mobile-stack {
                display: block !important;
                width: 100% !important;
            }
            
            .mobile-hide {
                display: none !important;
            }
            
            .mobile-center {
                text-align: center !important;
            }
            
            .mobile-padding {
                padding: 15px !important;
            }
            
            .mobile-font-sm {
                font-size: 20px !important;
                line-height: 26px !important;
            }
            
            .desktop-visible {
                display: none !important;
            }
        }
            
            .mobile-font-xs {
                font-size: 14px !important;
                line-height: 18px !important;
            }
            
            .mobile-font-xxs {
                font-size: 12px !important;
                line-height: 16px !important;
            }
            
            .mobile-table-stack {
                display: block !important;
                width: 100% !important;
                padding: 8px !important;
            }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); font-family: Arial, Helvetica, sans-serif;">
    
    <!-- Email Container -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);">
        <tr>
            <td style="padding: 20px 10px;">
                
                <!-- Main Email Table -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px; background: rgba(15, 23, 42, 0.95); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">
                    
                    <!-- Header Section with Cyber Background -->
                    <tr>
                        <td style="position: relative; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #a855f7 50%, #c084fc 75%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
                            
                            <!-- Content -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        <!-- Logo/Icon -->
                                        <div style="margin-bottom: 20px;">
                                            <div style="display: inline-block; width: 60px; height: 60px; background: rgba(255, 255, 255, 0.1); border-radius: 50%; padding: 15px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);">
                                                <div style="width: 30px; height: 30px; background: linear-gradient(45deg, #00d4ff, #00ff88); border-radius: 4px; margin: 0 auto;"></div>
                                            </div>
                                        </div>
                                        
                                        <!-- Main Title -->
                                        <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 700; color: #ffffff; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); font-family: Arial, Helvetica, sans-serif; line-height: 1.2;" class="mobile-font-sm">
                                            🛡️ CYBER THREAT ADVISORY
                                        </h1>
                                        
                                        <!-- Advisory Title -->
                                        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 600; color: rgba(255, 255, 255, 0.95); font-family: Arial, Helvetica, sans-serif; line-height: 1.3;" class="mobile-font-xs">
                                            ${advisory.title || 'Untitled Advisory'}
                                        </h2>
                                        
                                        <!-- Subtitle -->
                                        <p style="margin: 0; font-size: 16px; color: rgba(255, 255, 255, 0.8); font-family: Arial, Helvetica, sans-serif; font-weight: 400;" class="mobile-font-xxs">
                                            Critical Security Intelligence Alert
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Badges Section -->
                    <tr>
                        <td style="padding: 25px 30px; background: rgba(15, 23, 42, 0.95);" class="mobile-padding">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="text-align: center;">
                                        
                                        <!-- Severity Badge -->
                                        ${advisory.severity ? `
                                        <div style="display: inline-block; margin: 0 10px 15px 10px;">
                                            <div style="background: ${severityColor.bg}; color: #ffffff; padding: 8px 20px; border-radius: 25px; font-size: 14px; font-weight: 700; text-transform: uppercase; box-shadow: 0 4px 15px ${severityColor.glow}; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); font-family: Arial, Helvetica, sans-serif;">
                                                🚨 ${advisory.severity.toUpperCase()}
                                            </div>
                                        </div>
                                        ` : ''}
                                        
                                        <!-- TLP Badge -->
                                        ${advisory.tlp ? `
                                        <div style="display: inline-block; margin: 0 10px 15px 10px;">
                                            <div style="background: ${tlpColor.bg}; color: ${tlpColor.text}; padding: 8px 20px; border-radius: 25px; font-size: 14px; font-weight: 700; text-transform: uppercase; box-shadow: 0 4px 15px ${tlpColor.glow}; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); font-family: Arial, Helvetica, sans-serif;">
                                                🔒 TLP: ${advisory.tlp.toUpperCase()}
                                            </div>
                                        </div>
                                        ` : ''}
                                        
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px; background: rgba(15, 23, 42, 0.95);" class="mobile-padding">
                            
                            ${customMessage ? `
                            <!-- Custom Message -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="background: rgba(5, 150, 105, 0.8); border-radius: 12px; padding: 20px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">📢 Message from Security Team</h3>
                                        <p style="margin: 0; font-size: 14px; color: #ecfdf5; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">${customMessage.replace(/\n/g, '<br>')}</p>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            <!-- Executive Summary -->
                            ${advisory.executiveSummary || advisory.summary || advisory.description ? `
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="background: rgba(51, 65, 85, 0.7); border-radius: 12px; padding: 25px; border: 1px solid rgba(148, 163, 184, 0.2); backdrop-filter: blur(10px);">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #60a5fa; font-family: Arial, Helvetica, sans-serif;">📊 Executive Summary</h3>
                                        <p style="margin: 0; font-size: 16px; color: rgba(255, 255, 255, 0.9); line-height: 1.6; font-family: Arial, Helvetica, sans-serif;" class="mobile-font-xs">
                                            ${advisory.executiveSummary || advisory.summary || advisory.description}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            <!-- Threat Details Grid -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <!-- Left Column - Threat Parameters -->
                                    <td style="width: 48%; vertical-align: top;" class="mobile-stack">
                                        <div style="background: rgba(51, 65, 85, 0.7); border-radius: 12px; padding: 20px; border: 1px solid rgba(148, 163, 184, 0.2); backdrop-filter: blur(10px); margin-bottom: 15px;">
                                            <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700; color: #60a5fa; font-family: Arial, Helvetica, sans-serif;">📊 Threat Parameters</h3>
                                            
                                            ${advisory.category ? `
                                            <div style="margin-bottom: 12px;">
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Category</div>
                                                <div style="font-size: 14px; color: #ffffff; font-weight: 500; font-family: Arial, Helvetica, sans-serif;">${advisory.category}</div>
                                            </div>
                                            ` : ''}
                                            
                                            ${advisory.publishedDate ? `
                                            <div style="margin-bottom: 12px;">
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Published</div>
                                                <div style="font-size: 14px; color: #ffffff; font-weight: 500; font-family: Arial, Helvetica, sans-serif;">${new Date(advisory.publishedDate).toLocaleDateString()}</div>
                                            </div>
                                            ` : ''}
                                            
                                            ${advisory.author ? `
                                            <div>
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 4px; font-family: Arial, Helvetica, sans-serif;">Analyst</div>
                                                <div style="font-size: 14px; color: #ffffff; font-weight: 500; font-family: Arial, Helvetica, sans-serif;">${advisory.author}</div>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </td>
                                    
                                    <!-- Spacer for desktop -->
                                    <td style="width: 4%;" class="mobile-hide"></td>
                                    
                                    <!-- Right Column - Affected Systems -->
                                    <td style="width: 48%; vertical-align: top;" class="mobile-stack">
                                        <div style="background: rgba(51, 65, 85, 0.7); border-radius: 12px; padding: 20px; border: 1px solid rgba(148, 163, 184, 0.2); backdrop-filter: blur(10px); margin-bottom: 15px;">
                                            <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700; color: #f59e0b; font-family: Arial, Helvetica, sans-serif;">🎯 Affected Systems</h3>
                                            
                                            <!-- CVE Tags -->
                                            ${(advisory.cveIds?.length || advisory.cves?.length) ? `
                                            <div style="margin-bottom: 15px;">
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; font-family: Arial, Helvetica, sans-serif;">CVE IDs</div>
                                                <div>
                                                    ${(advisory.cveIds || advisory.cves || []).map(cve => 
                                                        `<span style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; margin: 2px 4px 2px 0; font-family: monospace;">${cve}</span>`
                                                    ).join('')}
                                                </div>
                                            </div>
                                            ` : ''}
                                            
                                            <!-- Target Sectors -->
                                            ${advisory.targetSectors?.length ? `
                                            <div style="margin-bottom: 15px;">
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; font-family: Arial, Helvetica, sans-serif;">Target Sectors</div>
                                                <div>
                                                    ${advisory.targetSectors.map(sector => 
                                                        `<span style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; margin: 2px 4px 2px 0; font-family: Arial, Helvetica, sans-serif;">${sector}</span>`
                                                    ).join('')}
                                                </div>
                                            </div>
                                            ` : ''}
                                            
                                            <!-- Affected Products -->
                                            ${advisory.affectedProducts?.length ? `
                                            <div>
                                                <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; margin-bottom: 6px; font-family: Arial, Helvetica, sans-serif;">Affected Products</div>
                                                <div>
                                                    ${advisory.affectedProducts.map(product => 
                                                        `<span style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; margin: 2px 4px 2px 0; font-family: Arial, Helvetica, sans-serif;">${product}</span>`
                                                    ).join('')}
                                                </div>
                                            </div>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- MITRE ATT&CK Framework -->
                            ${advisory.mitreTactics?.length && advisory.mitreTactics.some(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)) ? `
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="background: rgba(51, 65, 85, 0.7); border-radius: 12px; padding: 25px; border: 1px solid rgba(148, 163, 184, 0.2); backdrop-filter: blur(10px);">
                                        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #f59e0b; font-family: Arial, Helvetica, sans-serif;">🛡️ MITRE ATT&CK Framework</h3>
                                        
                                        <!-- MITRE Table -->
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                                            <tr style="background: rgba(75, 85, 99, 0.5);">
                                                <td style="padding: 10px; border: 1px solid rgba(107, 114, 128, 0.3); font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;" class="mobile-table-stack">Tactic</td>
                                                <td style="padding: 10px; border: 1px solid rgba(107, 114, 128, 0.3); font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;" class="mobile-table-stack">ID</td>
                                                <td style="padding: 10px; border: 1px solid rgba(107, 114, 128, 0.3); font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;" class="mobile-table-stack">Technique</td>
                                            </tr>
                                            ${advisory.mitreTactics.filter(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)).map(tactic => 
                                                `<tr>
                                                    <td style="padding: 10px; border: 1px solid rgba(107, 114, 128, 0.3); font-size: 13px; color: #ffffff; font-weight: 600; font-family: Arial, Helvetica, sans-serif;" class="mobile-table-stack">${tactic.name || tactic.tacticName || 'Unknown'}</td>
                                                    <td style="padding: 10px; border: 1px solid rgba(107, 114, 128, 0.3); font-size: 11px; color: #fbbf24; font-family: monospace; font-weight: 600;" class="mobile-table-stack">${tactic.id || tactic.techniqueId || 'N/A'}</td>
                                                    <td style="padding: 10px; border: 1px solid rgba(107, 114, 128, 0.3); font-size: 12px; color: rgba(255, 255, 255, 0.9); font-family: Arial, Helvetica, sans-serif;" class="mobile-table-stack">${tactic.technique || tactic.name || 'No description available'}</td>
                                                </tr>`
                                            ).join('')}
                                        </table>
                                        
                                        <p style="text-align: center; color: #9ca3af; font-size: 11px; margin: 10px 0 0 0; font-style: italic; font-family: Arial, Helvetica, sans-serif;">
                                            📊 Total MITRE Tactics: ${advisory.mitreTactics.filter(tactic => tactic && (tactic.name || tactic.tacticName || tactic.technique)).length}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            <!-- Recommendations -->
                            ${advisory.recommendations?.length ? `
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="background: rgba(51, 65, 85, 0.7); border-radius: 12px; padding: 25px; border: 1px solid rgba(148, 163, 184, 0.2); backdrop-filter: blur(10px);">
                                        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #10b981; font-family: Arial, Helvetica, sans-serif;">✅ Security Recommendations</h3>
                                        
                                        <!-- Recommendation Items -->
                                        ${advisory.recommendations.map((rec, index) => 
                                            `<div style="margin-bottom: ${index === advisory.recommendations.length - 1 ? '0' : '15px'}; padding: 15px 15px 15px 45px; background: linear-gradient(135deg, #1e40af, #1d4ed8); border-radius: 8px; position: relative; color: #ffffff; font-size: 14px; line-height: 1.4; font-family: Arial, Helvetica, sans-serif;" class="mobile-font-xs">
                                                <div style="position: absolute; left: 15px; top: 15px; width: 20px; height: 20px; background: #fbbf24; color: #000000; border-radius: 50%; font-weight: 700; font-size: 12px; text-align: center; line-height: 20px;">${index + 1}</div>
                                                ${rec}
                                            </div>`
                                        ).join('')}
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            <!-- Call to Action -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 12px; padding: 25px; text-align: center; border: 1px solid rgba(59, 130, 246, 0.3);">
                                        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 700; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">📋 Full Advisory Report</h3>
                                        <p style="margin: 0 0 20px 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-family: Arial, Helvetica, sans-serif;" class="mobile-font-xs">
                                            Access comprehensive threat analysis, IOCs, and detailed mitigation strategies
                                        </p>
                                        ${createTrackedLink(`${baseUrl}/advisory/${advisory._id}`, `<span style="display: inline-block; background: rgba(255, 255, 255, 0.1); color: #fbbf24; padding: 12px 25px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); font-family: Arial, Helvetica, sans-serif;">📄 View Full Report</span>`, 'main_cta')}
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: rgba(17, 24, 39, 0.95); padding: 25px 30px; text-align: center; border-top: 2px solid #3b82f6;" class="mobile-padding">
                            <div style="margin-bottom: 15px;">
                                <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">🦅 EaglEye IntelDesk</h4>
                                <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #60a5fa; font-family: Arial, Helvetica, sans-serif;">Threat Intelligence Platform</p>
                                <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.7); font-family: Arial, Helvetica, sans-serif;">🔬 Forensic Cyber Tech | Digital Forensics & Cybersecurity</p>
                            </div>
                            
                            <div style="border-top: 1px solid rgba(107, 114, 128, 0.3); padding-top: 15px;">
                                <p style="margin: 0; font-size: 11px; color: rgba(255, 255, 255, 0.5); font-style: italic; line-height: 1.4; font-family: Arial, Helvetica, sans-serif;">
                                    🤖 This is an automated security advisory from your threat intelligence system.<br>
                                    📧 Please do not reply to this email. For support, contact your security team.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
    ${trackingData ? `<!-- Email Tracking Pixel -->
    <img src="${baseUrl}/api/emails/tracking?t=${trackingData.trackingId}&type=open" width="1" height="1" style="display:none;" alt="" />` : ''}
    
</body>
</html>`;
}
