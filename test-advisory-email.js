// Test file for Advisory Email Generator
// File: test-advisory-email.js

const AdvisoryEmailGenerator = require('./lib/advisoryEmailGenerator');

// Sample advisory data (based on your provided data)
const sampleAdvisory = {
  "_index": "ti-generated-advisories",
  "_id": "SOC-TA-20260212-092858",
  "_version": 4,
  "_source": {
    "schema_version": "1.0",
    "advisory_id": "SOC-TA-20260212-092858",
    "article_id": "831b0212031236612f95a501d20d00128066c92f",
    "incident_key": "CVE::CVE-2025-29927,CVE-2025-55182",
    "title": "Remote Code Execution – React2Shell",
    "display_title": "Remote Code Execution – React2Shell",
    "criticality": "CRITICAL",
    "threat_type": "Worm",
    "exec_summary_parts": [
      "A large-scale campaign has been identified targeting cloud-native environments through automated exploitation of exposed APIs and misconfigurations. The activity leverages multiple attack vectors including exposed Docker APIs, Kubernetes clusters, Ray dashboards, Redis servers, and a critical vulnerability in React/Next.js applications. The campaign operates as a self-propagating criminal ecosystem that systematically compromises infrastructure to establish distributed proxy networks, scanning capabilities, and command-and-control infrastructure."
    ],
    "affected_product": "React/Next.js applications",
    "vendor": "React",
    "sectors": ["Retail", "Transportation", "Technology", "Energy & Utilities", "Manufacturing"],
    "regions": ["Asia-Pacific", "North America", "East Asia"],
    "cves": ["CVE-2025-29927", "CVE-2025-55182"],
    "cvss": {
      "CVE-2025-29927": {
        "score": 9.1,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
        "criticality": "CRITICAL",
        "source": "NVD"
      },
      "CVE-2025-55182": {
        "score": 10,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
        "criticality": "CRITICAL",
        "source": "NVD"
      }
    },
    "iocs": [
      {"type": "ipv4", "value": "67.217.57.240"},
      {"type": "domain", "value": "kube.py"},
      {"type": "domain", "value": "mine.sh"},
      {"type": "domain", "value": "pcpcat.py"},
      {"type": "domain", "value": "proxy.sh"},
      {"type": "domain", "value": "react.py"},
      {"type": "domain", "value": "scanner.py"}
    ],
    "mitre": [
      {"techniqueId": "T1190", "tactic": "Initial Access", "technique": "Exploit Public-Facing Application", "confidence": 2, "classification": "primary", "url": "https://attack.mitre.org/techniques/T1190/"}
    ],
    "mbc": [
      {"behavior": "Command and Control Communication", "objective": "Establish command channel", "confidence": "High", "evidence": "The campaign operates as a self-propagating criminal ecosystem that systematically compromises infrastructure to establish distributed proxy networks, scanning capabilities, and command-and-control infrastructure."}
    ],
    "recommendations": [
      "Immediately patch CVE-2025-55182 in all React/Next.js applications",
      "Restrict and secure Docker API endpoints with authentication",
      "Implement network segmentation for Kubernetes clusters",
      "Monitor for suspicious proxy and tunneling activity",
      "Review and harden Redis server configurations",
      "Deploy runtime protection for cloud workloads",
      "Conduct regular vulnerability assessments of cloud infrastructure",
      "Implement least privilege access controls for cloud resources"
    ],
    "references": ["https://thehackernews.com/2026/02/teampcp-worm-exploits-cloud.html"],
    "tlp": "AMBER",
    "status": "EAGLE_NEST",
    "created_at": "2026-02-12T09:28:58.905943Z",
    "ip_sweep": {
      "advisory_id": "SOC-TA-20260212-092858",
      "checked_at": "2026-02-12T09:29:27.437190",
      "impacted_clients": [
        {
          "client_id": "prince_001",
          "client_name": "Prince",
          "matches": [
            {"ioc": "67.217.57.240", "matched_field": "srcip", "log_index": "sample-fw-logs", "timestamp": "2026-02-12T07:16:12.756+0000"},
            {"ioc": "67.217.57.240", "matched_field": "srcip", "log_index": "sample-fw-logs", "timestamp": "2026-02-12T07:16:07.756+0000"},
            {"ioc": "67.217.57.240", "matched_field": "srcip", "log_index": "sample-fw-logs", "timestamp": "2026-02-12T07:16:02.756+0000"},
            {"ioc": "67.217.57.240", "matched_field": "srcip", "log_index": "sample-fw-logs", "timestamp": "2026-02-12T07:15:57.756+0000"},
            {"ioc": "67.217.57.240", "matched_field": "srcip", "log_index": "sample-fw-logs", "timestamp": "2026-02-12T07:15:52.756+0000"}
          ]
        }
      ]
    }
  }
};

// Create email generator instance
const emailGenerator = new AdvisoryEmailGenerator();

// Generate email content
const recipient = { email: "test@example.com" };
const emailContent = emailGenerator.generateEmailContent(sampleAdvisory._source, recipient);

// Output the generated content
console.log("Email Subject:", emailContent.subject);
console.log("\nHTML Content Preview (first 500 chars):", emailContent.html.substring(0, 500) + "...");
console.log("\nText Content Preview (first 500 chars):", emailContent.text.substring(0, 500) + "...");

// Save HTML to file for testing
const fs = require('fs');
fs.writeFileSync('test-advisory-email.html', emailContent.html);
console.log("\nHTML email template saved to: test-advisory-email.html");
console.log("\nOpen test-advisory-email.html in a browser to see the full email template.");
