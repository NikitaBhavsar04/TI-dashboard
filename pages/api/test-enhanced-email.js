// Test endpoint for enhanced email functionality
export default async function handler(req, res) {
  if (r        // Schedule a test email with the mock advisory
        agenda.now('test-enhanced-advisory-email', {
          advisoryId: mockAdvisory._id,
          recipients: ['test@example.com'],
          customMessage: customMessage,
          mockAdvisory: mockAdvisory // Pass mock data for testing
        });
        
        resolve({
          success: true,
          message: 'Enhanced email template test scheduled successfully',
          advisory: {
            title: mockAdvisory.title,
            severity: mockAdvisory.severity,
            threatId: mockAdvisory.threatId,
            cveCount: mockAdvisory.cveIds?.length || 0,
            iocCount: mockAdvisory.iocs?.length || 0,
            recommendationCount: mockAdvisory.recommendations?.length || 0,
            patchDetailsCount: mockAdvisory.patchDetails?.length || 0,
            mitreTacticsCount: mockAdvisory.mitreTactics?.length || 0,
            affectedProductsCount: mockAdvisory.affectedProducts?.length || 0,
            targetSectorsCount: mockAdvisory.targetSectors?.length || 0,
// Test endpoint for enhanced email functionality
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Mock advisory with comprehensive data for testing
    const mockAdvisory = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Critical RCE Vulnerability in Apache Struts Framework',
      description: 'A remote code execution vulnerability has been discovered in Apache Struts.',
      executiveSummary: 'Apache Struts 2 contains a critical vulnerability (CVE-2023-50164) that enables remote code execution through malicious file uploads. This affects web applications using vulnerable Struts versions and requires immediate patching.',
      severity: 'Critical',
      category: 'Web Application Security',
      threatId: 'THR-2023-1204',
      author: 'EaglEye Security Research Team',
      publishedDate: new Date('2023-12-04'),
      updatedAt: new Date('2023-12-05T10:30:00Z'),
      cvss: 9.8,
      cveIds: ['CVE-2023-50164', 'CVE-2023-50165'],
      content: `Technical Analysis:
The vulnerability exists in the file upload functionality of Apache Struts 2.3.x through 2.3.37, 2.5.x through 2.5.32, and 6.0.x through 6.3.0.

Attack Vector:
1. Attacker crafts malicious file upload request
2. Vulnerable Struts application processes file without validation
3. Malicious code executed on target server
4. Attacker gains unauthorized access`,
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
        'Review and audit file upload functionality across all web applications'
      ],
      references: [
        'https://cwiki.apache.org/confluence/display/WW/S2-066',
        'https://nvd.nist.gov/vuln/detail/CVE-2023-50164',
        'https://security.apache.org/blog/struts-security-advisory/'
      ],
      tags: ['Apache Struts', 'RCE', 'Web Application', 'Critical', 'CVE-2023-50164'],
      affectedProducts: ['Apache Struts 2.3.x', 'Apache Struts 2.5.x', 'Apache Struts 6.0.x'],
      targetSectors: ['Technology', 'Healthcare', 'Financial Services', 'Government', 'E-commerce'],
      regions: ['Global', 'North America', 'Europe', 'Asia-Pacific'],
      tlp: 'WHITE',
      patchDetails: [
        'Apache Struts 2.5.33 - Released December 4, 2023 - Fixes CVE-2023-50164 and CVE-2023-50165',
        'Apache Struts 6.4.0 - Released December 4, 2023 - Complete fix for file upload vulnerabilities',
        'Emergency patch available for Struts 2.3.x users - Contact Apache support',
        'Workaround: Disable file upload functionality until patches can be applied',
        'Verify patch installation: Check version with "mvn dependency:tree | grep struts"'
      ],
      mitreTactics: [
        {
          tactic: 'Initial Access',
          technique: 'Exploit Public-Facing Application',
          id: 'T1190'
        },
        {
          tactic: 'Execution',
          technique: 'Server Software Component',
          id: 'T1505.003'
        },
        {
          tactic: 'Persistence',
          technique: 'Web Shell',
          id: 'T1505.003'
        },
        {
          tactic: 'Defense Evasion',
          technique: 'Masquerading',
          id: 'T1036'
        }
      ]
    };

    const customMessage = req.body.customMessage || `This is a high-priority security alert from the EaglEye SOC team.

Please ensure immediate action is taken to:
1. Identify all Struts-based applications
2. Apply patches within 24 hours
3. Report status to security@company.com

Contact the SOC team for assistance: +1-555-SECURITY`;

    // Import the agenda module
    const agenda = require('../../lib/agenda');
    
    // Test email generation
    const result = await new Promise((resolve, reject) => {
      try {
        // Schedule a test email with the mock advisory
        agenda.now('test-enhanced-advisory-email', {
          advisoryId: mockAdvisory._id,
          recipients: ['test@example.com'],
          customMessage: customMessage,
          mockAdvisory: mockAdvisory // Pass mock data for testing
        });
        
        resolve({
          success: true,
          message: 'Enhanced email template test scheduled successfully',
          advisory: {
            title: mockAdvisory.title,
            severity: mockAdvisory.severity,
            threatId: mockAdvisory.threatId,
            cveCount: mockAdvisory.cveIds?.length || 0,
            iocCount: mockAdvisory.iocs?.length || 0,
            recommendationCount: mockAdvisory.recommendations?.length || 0
          }
        });
      } catch (error) {
        reject(error);
      }
    });

    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error testing enhanced email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test enhanced email template',
      error: error.message 
    });
  }
}
