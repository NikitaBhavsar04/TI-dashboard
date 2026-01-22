// Simplified test for email template
const mockAdvisory = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Critical RCE Vulnerability in Apache Struts Framework',
  description: 'A remote code execution vulnerability has been discovered in Apache Struts.',
  executiveSummary: 'Apache Struts 2 contains a critical vulnerability (CVE-2023-50164) that enables remote code execution through malicious file uploads.',
  severity: 'Critical',
  category: 'Web Application Security',
  threatId: 'THR-2023-1204',
  author: 'EaglEye Security Research Team',
  cvss: 9.8,
  cveIds: ['CVE-2023-50164', 'CVE-2023-50165'],
  content: 'Technical analysis of the vulnerability...',
  iocs: [
    { type: 'IP', value: '192.168.1.100', description: 'Known malicious IP' },
    { type: 'Hash', value: 'd41d8cd98f00b204e9800998ecf8427e', description: 'MD5 hash of malicious payload' }
  ],
  recommendations: ['Immediately upgrade Apache Struts', 'Implement WAF rules'],
  references: ['https://cwiki.apache.org/confluence/display/WW/S2-066'],
  tags: ['Apache Struts', 'RCE', 'Critical']
};

// Helper function to generate advisory email body
function generateAdvisoryEmailBody(advisory, customMessage = '') {
  const baseUrl = 'https://inteldesk.eagleyesoc.ai';
  
  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#3b82f6';
    }
  };
  
  const severityColor = getSeverityColor(advisory.severity);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Threat Advisory: ${advisory.title || 'Untitled'}</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 0 !important; }
            .content { padding: 15px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', sans-serif;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0f172a;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #1e293b; border-radius: 12px;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${severityColor}, #1e40af); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🛡️ CYBER THREAT ADVISORY</h1>
                            <span style="background: rgba(255,255,255,0.2); color: #ffffff; padding: 8px 16px; border-radius: 25px; font-size: 14px;">
                                ${advisory.severity ? advisory.severity.toUpperCase() : 'ADVISORY'} LEVEL
                            </span>
                        </td>
                    </tr>
                    
                    <!-- Title -->
                    <tr>
                        <td style="padding: 30px; background: #334155;">
                            <h2 style="margin: 0; color: #f1f5f9; font-size: 24px; text-align: center;">
                                ${advisory.title || 'Untitled Advisory'}
                            </h2>
                            ${advisory.threatId ? `<p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px; text-align: center;">Threat ID: ${advisory.threatId}</p>` : ''}
                        </td>
                    </tr>
                    
                    <!-- Custom Message -->
                    ${customMessage ? `
                    <tr>
                        <td style="padding: 25px 30px; background: linear-gradient(135deg, #059669, #047857);">
                            <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px;">📢 Message from Security Team</h3>
                            <p style="margin: 0; color: #d1fae5; line-height: 1.6;">${customMessage.replace(/\n/g, '<br>')}</p>
                        </td>
                    </tr>
                    ` : ''}
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px; background: #334155;">
                            
                            <!-- Executive Summary -->
                            ${advisory.executiveSummary ? `
                            <div style="background: linear-gradient(135deg, #1e40af, #3730a3); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Executive Summary</h3>
                                <p style="margin: 0; color: #e2e8f0; line-height: 1.6;">${advisory.executiveSummary}</p>
                            </div>
                            ` : ''}
                            
                            <!-- CVE Information -->
                            ${advisory.cveIds && advisory.cveIds.length > 0 ? `
                            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">🔍 CVE Identifiers</h3>
                                <div>
                                    ${advisory.cveIds.map(cve => `<span style="display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 12px; margin: 3px; border-radius: 4px; font-family: monospace;">${cve}</span>`).join('')}
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- IOCs -->
                            ${advisory.iocs && advisory.iocs.length > 0 ? `
                            <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">⚠️ Indicators of Compromise</h3>
                                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                    <tr style="background: rgba(255,255,255,0.2);">
                                        <th style="padding: 8px; text-align: left; color: #ffffff; font-size: 12px;">Indicator</th>
                                        <th style="padding: 8px; text-align: left; color: #ffffff; font-size: 12px;">Type</th>
                                        <th style="padding: 8px; text-align: left; color: #ffffff; font-size: 12px;">Description</th>
                                    </tr>
                                    ${advisory.iocs.map(ioc => `
                                    <tr>
                                        <td style="padding: 8px; color: #fef2f2; font-family: monospace; font-size: 11px;">${ioc.value || 'N/A'}</td>
                                        <td style="padding: 8px; color: #e2e8f0; font-size: 11px;">${ioc.type || 'Unknown'}</td>
                                        <td style="padding: 8px; color: #e2e8f0; font-size: 11px;">${ioc.description || 'No description'}</td>
                                    </tr>
                                    `).join('')}
                                </table>
                            </div>
                            ` : ''}
                            
                            <!-- Recommendations -->
                            ${advisory.recommendations && advisory.recommendations.length > 0 ? `
                            <div style="background: linear-gradient(135deg, #059669, #047857); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px;">Recommendations</h3>
                                <ul style="margin: 0; padding: 0; list-style: none;">
                                    ${advisory.recommendations.map(rec => `<li style="margin-bottom: 10px; color: #d1fae5; line-height: 1.6;"><span style="color: #10b981; margin-right: 8px;">▸</span> ${rec}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 25px; text-align: center; background: #0f172a;">
                            <h3 style="margin: 0 0 15px 0; color: #f1f5f9; font-size: 16px;">📖 View Complete Advisory</h3>
                            <a href="${baseUrl}/advisory/${advisory._id}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                                Open Full Report →
                            </a>
                            <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">🦅 EaglEye IntelDesk | Threat Intelligence Platform</p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// Test the function
console.log('🧪 Testing Enhanced Email Template...\n');

const customMessage = `High priority security alert - immediate action required!

Please:
1. Patch all Struts applications
2. Monitor for exploitation attempts
3. Report status to SOC team`;

const emailHtml = generateAdvisoryEmailBody(mockAdvisory, customMessage);

console.log('Email generation successful!');
console.log(`📏 Size: ${(emailHtml.length / 1024).toFixed(2)} KB`);

// Verify components
const checks = [
  'CYBER THREAT ADVISORY',
  'CRITICAL LEVEL',
  'Apache Struts Framework',
  'THR-2023-1204',
  'Executive Summary',
  'CVE-2023-50164',
  '192.168.1.100',
  'Immediately upgrade',
  'High priority security alert',
  'EaglEye IntelDesk'
];

console.log('\n🔍 Component Check:');
checks.forEach(item => {
  console.log(`${emailHtml.includes(item) ? '✅' : '❌'} ${item}`);
});

// Save file
const fs = require('fs');
fs.writeFileSync('sample-enhanced-email.html', emailHtml, 'utf8');
console.log('\n💾 Sample saved as: sample-enhanced-email.html');
console.log('🎉 Enhanced email template is working with comprehensive advisory data!');
