// Complete email sending test with all three sections
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { agenda } = require('../../lib/agenda');
    
    // Complete test advisory with ALL sections guaranteed
    const testAdvisory = {
      _id: '66b8a1234567890123456789',
      title: 'THREAT ALERT: Exposure of Private Personal Information in Dynamics 365 FastTrack Implementation Assets',
      description: 'A critical vulnerability, identified as CVE-2025-49715, has been discovered in Microsoft Dynamics 365 FastTrack Implementation Assets, enabling unauthorized attackers to access private personal information over a network.',
      executiveSummary: 'A critical vulnerability, identified as CVE-2025-49715, has been discovered in Microsoft Dynamics 365 FastTrack Implementation Assets, enabling unauthorized attackers to access private personal information over a network. This flaw stems from inadequate access controls, allowing malicious actors to extract sensitive data such as personal identifiable information (PII) without proper authentication. The vulnerability poses a severe risk to organizations using Dynamics 365, particularly those handling sensitive customer or employee data. Exploitation could lead to data breaches, regulatory fines, and reputational damage. The issue affects cloud-based deployments of Dynamics 365, with potential impacts across multiple industries. Microsoft has acknowledged the vulnerability and released patches to mitigate the risk. Immediate action is required to apply updates and implement additional security measures to prevent unauthorized access. Organizations should prioritize patch deployment and review access controls to safeguard sensitive information.',
      severity: 'High',
      category: 'Information Disclosure',
      publishedDate: new Date('2025-07-08'),
      tlp: 'AMBER',
      cvss: 8.5,
      cveIds: ['CVE-2025-49715'],
      
      // RECOMMENDATIONS SECTION - Guaranteed to show
      recommendations: [
        'Apply Security Patches Promptly: Immediately update Dynamics 365 FastTrack Implementation Assets to the latest patched version as specified by Microsoft. Ensure all environments, including production and testing, are updated to prevent exploitation. Regularly check Microsoft\'s Security Update Guide for new patches.',
        'Implement Strong Access Controls: Enforce strict access controls using Microsoft Entra ID Conditional Access policies. Require multi-factor authentication (MFA) for all users and limit access to Dynamics 365 resources based on the principle of least privilege. Regularly audit user permissions to identify and remove unnecessary access.',
        'Enable Monitoring and Logging: Activate auditing in Microsoft Purview and Defender for Cloud Apps to monitor Dynamics 365 activities. Set up alerts for suspicious activities, such as unauthorized access attempts or unusual data access patterns, to detect and respond to potential breaches in real-time.'
      ],
      
      // 🔧 PATCH DETAILS SECTION - Guaranteed to show  
      patchDetails: [
        'Download Security Update KB5042421 from Microsoft Update Catalog or Windows Update for Business to address CVE-2025-49715 in Dynamics 365 FastTrack Implementation Assets',
        'Apply patches during scheduled maintenance windows with proper backup procedures and testing in non-production environments first to ensure compatibility',
        'Verify patch installation success using Microsoft System Center Configuration Manager (SCCM) or Windows Server Update Services (WSUS) reporting tools',
        'Coordinate with Microsoft Premier Support for enterprise environments requiring custom deployment strategies or compatibility testing procedures',
        'Monitor systems post-patch deployment for 48-72 hours to identify any performance degradation, functionality issues, or unexpected system behavior',
        'Update security baseline configurations and documentation to reflect new patch levels and ensure compliance with organizational security policies',
        'Implement automated patch validation scripts to verify successful installation and functionality of critical Dynamics 365 services and integrations'
      ],
      
      // 📋 METADATA SECTION - Guaranteed to show
      affectedProducts: ['Microsoft Dynamics 365 FastTrack Implementation Assets (Cloud-based deployments)'],
      targetSectors: ['Financial Services', 'Healthcare', 'Retail', 'Other'],
      regions: ['Global', 'North America', 'Europe', 'Asia-Pacific'],
      analyst: 'Unknown Analyst',
      
      // MITRE ATT&CK Framework - Guaranteed to show
      mitreTactics: [
        {
          tactic: 'Initial Access',
          technique: 'Exploit Public-Facing Application',
          id: 'T1190'
        },
        {
          tactic: 'Collection', 
          technique: 'Data from Information Repositories',
          id: 'T1213'
        },
        {
          tactic: 'Exfiltration',
          technique: 'Exfiltration Over Command and Control Channel', 
          id: 'T1041'
        }
      ]
    };

    // Initialize agenda and schedule the email
    const agendaInstance = agenda;
    
    // Schedule immediate email with test recipients
    await agendaInstance.now('send email', {
      recipients: ['mayank@forensiccybertech.com'], // Replace with your test email
      advisory: testAdvisory,
      customMessage: 'This is a comprehensive test email with ALL THREE SECTIONS: Recommendations, 🔧 Patch Details, and 📋 Metadata'
    });

    console.log('Comprehensive test email scheduled with all sections');
    
    res.status(200).json({ 
      message: 'Comprehensive test email sent successfully with all three sections',
      sections: {
        recommendations: testAdvisory.recommendations.length,
        patchDetails: testAdvisory.patchDetails.length,
        mitreTactics: testAdvisory.mitreTactics.length,
        affectedProducts: testAdvisory.affectedProducts.length,
        targetSectors: testAdvisory.targetSectors.length
      }
    });

  } catch (error) {
    console.error('Error sending comprehensive test email:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
}
