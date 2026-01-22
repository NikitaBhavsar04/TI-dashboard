const mongoose = require('mongoose');

// Mock advisory with comprehensive data
const mockAdvisory = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Critical RCE Vulnerability in Apache Struts Framework',
  description: 'A remote code execution vulnerability has been discovered in Apache Struts that allows attackers to execute arbitrary commands.',
  executiveSummary: 'Apache Struts 2 contains a critical vulnerability (CVE-2023-50164) that enables remote code execution through malicious file uploads. This affects web applications using vulnerable Struts versions and requires immediate patching.',
  severity: 'Critical',
  category: 'Web Application Security',
  threatId: 'THR-2023-1204',
  author: 'EaglEye Security Research Team',
  publishedDate: new Date('2023-12-04'),
  cvss: 9.8,
  cveIds: ['CVE-2023-50164', 'CVE-2023-50165'],
  content: `Technical Analysis:
The vulnerability exists in the file upload functionality of Apache Struts 2.3.x through 2.3.37, 2.5.x through 2.5.32, and 6.0.x through 6.3.0. The flaw allows remote unauthenticated attackers to upload malicious files that can lead to remote code execution.

Attack Vector:
1. Attacker crafts a malicious file upload request
2. The vulnerable Struts application processes the file without proper validation
3. Malicious code is executed on the target server
4. Attacker gains unauthorized access to the system

Impact Assessment:
- Complete system compromise possible
- Data exfiltration and theft
- Lateral movement within network
- Service disruption and downtime`,
  iocs: [
    {
      type: 'IP',
      value: '192.168.1.100',
      description: 'Known malicious IP used in exploitation attempts'
    },
    {
      type: 'Hash',
      value: 'd41d8cd98f00b204e9800998ecf8427e',
      description: 'MD5 hash of malicious payload file'
    },
    {
      type: 'URL',
      value: 'http://malicious-site.com/exploit.jsp',
      description: 'Command and control server URL'
    }
  ],
  recommendations: [
    'Immediately upgrade Apache Struts to version 2.5.33, 6.4.0, or later',
    'Implement web application firewalls (WAF) with rules to block malicious file uploads',
    'Conduct thorough security scanning of all Struts-based applications',
    'Monitor network traffic for indicators of compromise',
    'Review and audit file upload functionality across all web applications',
    'Implement proper input validation and sanitization controls'
  ],
  references: [
    'https://cwiki.apache.org/confluence/display/WW/S2-066',
    'https://nvd.nist.gov/vuln/detail/CVE-2023-50164',
    'https://security.apache.org/blog/struts-security-advisory/',
    'https://github.com/apache/struts/security/advisories'
  ],
  tags: ['Apache Struts', 'RCE', 'Web Application', 'Critical', 'CVE-2023-50164', 'File Upload'],
  affectedProducts: ['Apache Struts 2.3.x', 'Apache Struts 2.5.x', 'Apache Struts 6.0.x'],
  targetSectors: ['Technology', 'Healthcare', 'Financial Services', 'Government'],
  regions: ['Global'],
  tlp: 'WHITE'
};

// Test the email generation
async function testEmailGeneration() {
  console.log('🧪 Testing Enhanced Email Template Generation...\n');
  
  try {
    // Import the agenda module - get the function directly
    const agenda = require('./lib/agenda');
    
    // Test with custom message
    const customMessage = `This is a high-priority security alert from the EaglEye SOC team.

Please ensure immediate action is taken to:
1. Identify all Struts-based applications
2. Apply patches within 24 hours
3. Report status to security@company.com

Contact the SOC team for assistance: +1-555-SECURITY`;

    console.log('📧 Generating email with comprehensive advisory data...');
    
    // Import helper function directly from file
    const fs = require('fs');
    const agendaCode = fs.readFileSync('./lib/agenda.js', 'utf8');
    
    // Extract the generateAdvisoryEmailBody function
    const funcMatch = agendaCode.match(/function generateAdvisoryEmailBody\(advisory, customMessage = ''\) \{[\s\S]*?\n\}/);
    if (!funcMatch) {
      throw new Error('Could not find generateAdvisoryEmailBody function');
    }
    
    // Create a safe test function
    const generateAdvisoryEmailBody = eval(`(${funcMatch[0]})`);
    
    const emailHtml = generateAdvisoryEmailBody(mockAdvisory, customMessage);
    
    console.log('Email generation successful!');
    console.log(`📏 Generated email size: ${(emailHtml.length / 1024).toFixed(2)} KB`);
    
    // Check for key components
    const checks = [
      { name: 'Title', check: emailHtml.includes(mockAdvisory.title) },
      { name: 'Severity Badge', check: emailHtml.includes('CRITICAL LEVEL') },
      { name: 'Executive Summary', check: emailHtml.includes(mockAdvisory.executiveSummary) },
      { name: 'CVE IDs', check: emailHtml.includes('CVE-2023-50164') },
      { name: 'CVSS Score', check: emailHtml.includes('9.8') },
      { name: 'IOCs Table', check: emailHtml.includes('192.168.1.100') },
      { name: 'Recommendations', check: emailHtml.includes('Immediately upgrade Apache Struts') },
      { name: 'References', check: emailHtml.includes('cwiki.apache.org') },
      { name: 'Tags', check: emailHtml.includes('Apache Struts') },
      { name: 'Custom Message', check: emailHtml.includes('high-priority security alert') },
      { name: 'Threat ID', check: emailHtml.includes('THR-2023-1204') },
      { name: 'Technical Analysis', check: emailHtml.includes('Technical Analysis') },
      { name: 'Mobile Responsive', check: emailHtml.includes('@media only screen') }
    ];
    
    console.log('\n🔍 Component Verification:');
    checks.forEach(check => {
      console.log(`${check.check ? '✅' : '❌'} ${check.name}`);
    });
    
    const passedChecks = checks.filter(c => c.check).length;
    console.log(`\n📊 Results: ${passedChecks}/${checks.length} components verified`);
    
    if (passedChecks === checks.length) {
      console.log('🎉 All email components are working correctly!');
    } else {
      console.log('⚠️  Some components may be missing or not rendering properly.');
    }
    
    // Save sample email for manual inspection
    fs.writeFileSync('./sample-enhanced-email.html', emailHtml, 'utf8');
    console.log('\n💾 Sample email saved as: sample-enhanced-email.html');
    console.log('📖 Open this file in a browser to preview the email template');
    
  } catch (error) {
    console.error('❌ Error testing email generation:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Test without database connection
testEmailGeneration();
