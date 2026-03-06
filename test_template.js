const fs = require('fs');
const { generateAdvisory4EmailTemplate } = require('./lib/advisory4TemplateGenerator');

const sampleAdvisory = {
  advisory_id: 'ADV-2023-001',
  title: 'Critical Vulnerability in System',
  executive_summary: 'This is a test summary',
  iocs: {
    ipv4: ['192.168.1.1', '10.0.0.1'],
    domains: ['evil.com', 'bad.org'],
    md5: ['d41d8cd98f00b204e9800998ecf8427e'],
    sha1: ['da39a3ee5e6b4b0d3255bfef95601890afd80709'],
    sha256: ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855']
  },
  recommendations: ['Patch system immediately', 'Isolate from network'],
  patch_details: ['Apply patch KB123456'],
  references: ['https://example.com/vuln', 'https://example.org/details'],
  cves: ['CVE-2023-1234']
};

const html = generateAdvisory4EmailTemplate(sampleAdvisory);
fs.writeFileSync('test_output_4.html', html);
console.log('Successfully generated test_output_4.html');