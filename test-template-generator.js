const { generateAdvisory4EmailTemplate } = require('./lib/advisory4TemplateGenerator.js');

// Sample advisory data in the new format (matches manual_advisory.py output)
const sampleAdvisory = {
  "schema_version": "1.0",
  "advisory_id": "SOC-TA-20260119-064603",
  "article_id": "test-article-123",
  "incident_key": "incident-456",
  "title": "Critical Security Vulnerability in Sample Software",
  "display_title": "Critical Security Vulnerability in Sample Software",
  "criticality": "CRITICAL",
  "threat_type": "Remote Code Execution",
  "exec_summary_parts": [
    "A critical remote code execution vulnerability has been discovered in Sample Software version 1.2.3.",
    "Attackers can exploit this vulnerability to execute arbitrary code on target systems without authentication.",
    "Immediate patching is recommended for all affected systems."
  ],
  "affected_product": "Sample Software v1.2.3",
  "vendor": "Sample Vendor Inc.",
  "cves": ["CVE-2024-12345"],
  "cvss": [
    {
      "cve": "CVE-2024-12345",
      "score": 9.8,
      "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      "criticality": "CRITICAL",
      "source": "NVD"
    }
  ],
  "iocs": [
    {
      "type": "domain",
      "value": "malicious-domain.com"
    },
    {
      "type": "ip",
      "value": "192.168.1.100"
    },
    {
      "type": "md5",
      "value": "d41d8cd98f00b204e9800998ecf8427e"
    },
    {
      "type": "sha256",
      "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  ],
  "mitre": [
    {
      "tactic": "Initial Access",
      "techniqueId": "T1190",
      "technique": "Exploit Public-Facing Application"
    },
    {
      "tactic": "Execution",
      "techniqueId": "T1059",
      "technique": "Command and Scripting Interpreter"
    }
  ],
  "mbc": [
    {
      "behavior": "Command and Control",
      "objective": "Communication",
      "confidence": "High",
      "evidence": "Network traffic analysis"
    }
  ],
  "recommendations": [
    "Apply the vendor-provided security patch immediately",
    "Monitor network traffic for signs of exploitation",
    "Review access logs for unauthorized activity",
    "Implement network segmentation to limit exposure"
  ],
  "patch_details": [
    "Sample Vendor Inc. has released version 1.2.4 addressing CVE-2024-12345",
    "Patch is available from the vendor support portal",
    "No configuration changes required after applying the patch"
  ],
  "references": [
    "https://example.com/article-source",
    "https://vendor.com/security-advisory"
  ],
  "tlp": "AMBER",
  "status": "DRAFT",
  "created_at": "2026-01-19T06:46:03Z"
};

console.log('🧪 Testing advisory template generator with new format...');
console.log('📊 Sample advisory data:', JSON.stringify(sampleAdvisory, null, 2));

try {
  const emailTemplate = generateAdvisory4EmailTemplate(sampleAdvisory);
  console.log('✅ Template generation successful!');
  console.log('📧 Email template length:', emailTemplate.length, 'characters');
  
  // Check if key fields are included
  const checks = [
    { field: 'advisory_id', check: emailTemplate.includes(sampleAdvisory.advisory_id) },
    { field: 'title', check: emailTemplate.includes(sampleAdvisory.title) },
    { field: 'criticality', check: emailTemplate.includes(sampleAdvisory.criticality) },
    { field: 'vendor', check: emailTemplate.includes(sampleAdvisory.vendor) },
    { field: 'CVSS score', check: emailTemplate.includes('9.8') },
    { field: 'CVE', check: emailTemplate.includes('CVE-2024-12345') },
    { field: 'IOC domain', check: emailTemplate.includes('malicious-domain.com') },
    { field: 'IOC IP', check: emailTemplate.includes('192.168.1.100') },
    { field: 'MITRE tactic', check: emailTemplate.includes('Initial Access') },
    { field: 'recommendations', check: emailTemplate.includes('Apply the vendor-provided') }
  ];
  
  console.log('\n🔍 Field validation results:');
  checks.forEach(check => {
    console.log(`  ${check.check ? '✅' : '❌'} ${check.field}`);
  });
  
  const allPassed = checks.every(check => check.check);
  console.log(`\n${allPassed ? '🎉 ALL CHECKS PASSED!' : '⚠️  Some checks failed'}`);
  
} catch (error) {
  console.error('❌ Template generation failed:', error);
  process.exit(1);
}