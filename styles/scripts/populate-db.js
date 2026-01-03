const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017/threat-advisory';

const sampleAdvisories = [
  {
    title: "APT29 Cozy Bear Campaign Targeting Government Infrastructure",
    description: "Advanced persistent threat group APT29 has been observed conducting a sophisticated campaign targeting government networks using novel malware variants and supply chain attacks.",
    summary: "Russian state-sponsored group APT29 launches coordinated attacks against critical government infrastructure using advanced malware and zero-day exploits.",
    severity: "Critical",
    category: "APT Campaign",
    iocs: [
      { type: "IP", value: "185.220.101.47", description: "C2 server hosting malware payloads" },
      { type: "Hash", value: "a1b2c3d4e5f6789012345678901234567890abcd", description: "Malicious executable hash" },
      { type: "Domain", value: "secure-update-gov.com", description: "Typosquatting domain mimicking legitimate site" },
      { type: "URL", value: "https://secure-update-gov.com/download/update.exe", description: "Malware distribution URL" }
    ],
    author: "THREAT-ANALYST-001",
    tags: ["APT29", "Cozy Bear", "Government", "Supply Chain", "Zero-day"],
    content: "EXECUTIVE SUMMARY:\n\nAPT29, also known as Cozy Bear, has been identified conducting a multi-stage campaign targeting government infrastructure across multiple countries. The campaign leverages sophisticated techniques including supply chain compromises, zero-day exploits, and advanced evasion mechanisms.\n\nATTACK VECTOR:\n\nThe initial attack vector involves spear-phishing emails containing malicious attachments that exploit a previously unknown vulnerability in Microsoft Office. Upon successful exploitation, the malware establishes persistence and begins lateral movement within the network.\n\nTECHNICAL ANALYSIS:\n\nThe malware sample (SHA256: a1b2c3d4e5f6789012345678901234567890abcd) exhibits advanced anti-analysis techniques including:\n- Virtual machine detection\n- Debugger evasion\n- API obfuscation\n- Encrypted C2 communications\n\nRECOMMENDATIONS:\n\n1. Immediately block all IOCs listed in this advisory\n2. Conduct network-wide scans for indicators\n3. Review and update email security policies\n4. Implement additional monitoring for lateral movement\n5. Apply latest security patches to all Microsoft Office installations",
    references: [
      "https://attack.mitre.org/groups/G0016/",
      "https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-008a",
      "https://www.microsoft.com/security/blog/apt29-analysis"
    ],
    cvss: 9.8,
    cveIds: ["CVE-2024-1234"],
    publishedDate: new Date('2024-12-15'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Ransomware-as-a-Service (RaaS) LockBit 3.0 Infrastructure Analysis",
    description: "Analysis of LockBit 3.0 ransomware infrastructure reveals new encryption algorithms, improved evasion techniques, and expanded affiliate network operations.",
    summary: "LockBit 3.0 ransomware group has upgraded their infrastructure with enhanced encryption and stealth capabilities, posing increased threat to enterprise networks.",
    severity: "High",
    category: "Ransomware",
    iocs: [
      { type: "IP", value: "192.168.100.25", description: "Payment portal hosting server" },
      { type: "Hash", value: "def456789abcdef0123456789abcdef0123456789", description: "LockBit 3.0 encryptor binary" },
      { type: "Domain", value: "lockbit3-payment.onion", description: "Tor-based payment portal" },
      { type: "Email", value: "support@lockbit-recovery.com", description: "Victim communication email" }
    ],
    author: "RANSOMWARE-TEAM-ALPHA",
    tags: ["LockBit", "Ransomware", "RaaS", "Encryption", "Double Extortion"],
    content: "THREAT OVERVIEW:\n\nLockBit 3.0 represents a significant evolution in ransomware capabilities, featuring improved encryption algorithms, enhanced anti-forensics capabilities, and streamlined affiliate operations.\n\nTECHNICAL CAPABILITIES:\n\n- Advanced AES-256 encryption with RSA-4096 key exchange\n- Multi-threaded encryption for faster file processing\n- Built-in network discovery and lateral movement\n- Automated data exfiltration before encryption\n- Self-deletion after encryption completion\n\nINFRASTRUCTURE ANALYSIS:\n\nThe LockBit 3.0 operation utilizes a distributed infrastructure with multiple redundant servers across different jurisdictions. Communication with victims occurs through Tor-hidden services to maintain anonymity.\n\nMITIGATION STRATEGIES:\n\n1. Implement comprehensive backup strategies with offline storage\n2. Deploy advanced endpoint detection and response (EDR) solutions\n3. Conduct regular security awareness training\n4. Maintain up-to-date patch management programs\n5. Implement network segmentation to limit lateral movement",
    references: [
      "https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-040a",
      "https://www.ic3.gov/Media/News/2022/220204.pdf"
    ],
    cvss: 8.5,
    cveIds: [],
    publishedDate: new Date('2024-12-10'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Supply Chain Attack via Compromised NPM Package 'crypto-utils-2024'",
    description: "Malicious NPM package 'crypto-utils-2024' discovered containing cryptocurrency wallet stealing functionality, affecting thousands of JavaScript applications.",
    summary: "Supply chain compromise through malicious NPM package targeting cryptocurrency wallets and sensitive application data.",
    severity: "High",
    category: "Supply Chain",
    iocs: [
      { type: "Hash", value: "789abc123def456789abc123def456789abc123de", description: "Malicious NPM package hash" },
      { type: "URL", value: "https://steal-crypto-data.herokuapp.com/collect", description: "Data exfiltration endpoint" },
      { type: "Domain", value: "fake-crypto-api.com", description: "Malicious API endpoint" }
    ],
    author: "SUPPLY-CHAIN-MONITOR",
    tags: ["Supply Chain", "NPM", "Cryptocurrency", "JavaScript", "Malware"],
    content: "INCIDENT SUMMARY:\n\nA malicious NPM package named 'crypto-utils-2024' was discovered containing code designed to steal cryptocurrency wallet information and sensitive application data. The package was available for download for approximately 3 weeks before detection.\n\nPACKAGE ANALYSIS:\n\nThe malicious package masqueraded as a legitimate cryptocurrency utility library but contained obfuscated code that:\n- Scanned for cryptocurrency wallet files\n- Extracted private keys and seed phrases\n- Transmitted stolen data to remote servers\n- Attempted to access browser-stored wallet extensions\n\nAFFECTED SYSTEMS:\n\nAny JavaScript application that installed the 'crypto-utils-2024' package between versions 1.0.0 and 1.2.5 may be compromised. The package received over 15,000 downloads during the attack window.\n\nREMEDIATION STEPS:\n\n1. Immediately remove the 'crypto-utils-2024' package from all projects\n2. Rotate all cryptocurrency wallet keys and seed phrases\n3. Scan systems for indicators of compromise\n4. Review package.json and lock files for the malicious package\n5. Implement dependency scanning tools to detect future threats",
    references: [
      "https://npmjs.com/advisories/crypto-utils-2024",
      "https://github.com/advisories/GHSA-crypto-2024"
    ],
    cvss: 7.8,
    cveIds: [],
    publishedDate: new Date('2024-12-08'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Zero-Day Vulnerability in Apache Struts 2 Web Framework",
    description: "Critical remote code execution vulnerability discovered in Apache Struts 2 framework affecting versions 2.5.x through 2.5.30, allowing unauthenticated remote code execution.",
    summary: "Critical zero-day RCE vulnerability in Apache Struts 2 framework enables remote attackers to execute arbitrary code without authentication.",
    severity: "Critical",
    category: "Vulnerability",
    iocs: [
      { type: "URL", value: "/.action", description: "Common Struts action endpoint" },
      { type: "Hash", value: "456def789abc123456def789abc123456def789ab", description: "Exploit payload hash" }
    ],
    author: "VULN-RESEARCH-TEAM",
    tags: ["Zero-day", "Apache Struts", "RCE", "Web Framework", "Critical"],
    content: "VULNERABILITY DETAILS:\n\nA critical remote code execution vulnerability has been identified in Apache Struts 2 framework versions 2.5.x through 2.5.30. The vulnerability stems from improper input validation in the OGNL expression evaluation engine.\n\nTECHNICAL DETAILS:\n\nCVE ID: CVE-2024-1234\nCVSS Score: 9.8 (Critical)\nAffected Versions: Apache Struts 2.5.x - 2.5.30\nAttack Vector: Network\nAuthentication Required: None\n\nEXPLOITATION:\n\nAttackers can exploit this vulnerability by sending specially crafted HTTP requests to Struts-based web applications. Successful exploitation allows for:\n- Remote code execution with application privileges\n- Data exfiltration\n- System compromise\n- Lateral movement within the network\n\nAFFECTED SYSTEMS:\n\nAny web application built using the affected versions of Apache Struts 2 framework is vulnerable. This includes enterprise applications, government portals, and e-commerce platforms.\n\nIMMEDIATE ACTIONS:\n\n1. Identify all systems running Apache Struts 2.5.x - 2.5.30\n2. Apply emergency patches or upgrade to Struts 2.5.31+\n3. Implement WAF rules to block exploit attempts\n4. Monitor for signs of compromise\n5. Review application logs for suspicious activity",
    references: [
      "https://struts.apache.org/security/",
      "https://nvd.nist.gov/vuln/detail/CVE-2024-1234",
      "https://www.cisa.gov/known-exploited-vulnerabilities"
    ],
    cvss: 9.8,
    cveIds: ["CVE-2024-1234"],
    publishedDate: new Date('2024-12-12'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "Phishing Campaign Targeting Financial Institutions",
    description: "Large-scale phishing campaign impersonating major banks and financial institutions to steal credentials and two-factor authentication codes.",
    summary: "Coordinated phishing attack targeting bank customers with sophisticated fake login pages and real-time credential theft.",
    severity: "Medium",
    category: "Phishing",
    iocs: [
      { type: "Domain", value: "secure-bank-login.net", description: "Phishing domain mimicking bank portal" },
      { type: "Domain", value: "financial-secure-access.com", description: "Secondary phishing domain" },
      { type: "IP", value: "203.45.67.89", description: "Hosting server for phishing sites" },
      { type: "Email", value: "security@bank-alerts.info", description: "Sender address for phishing emails" }
    ],
    author: "PHISHING-ANALYSIS-UNIT",
    tags: ["Phishing", "Financial", "Banking", "Credential Theft", "2FA Bypass"],
    content: "CAMPAIGN OVERVIEW:\n\nA sophisticated phishing campaign has been identified targeting customers of major financial institutions. The campaign utilizes convincing replicas of legitimate banking websites to steal credentials and bypass two-factor authentication.\n\nATTACK METHODOLOGY:\n\n1. Initial Contact: Victims receive emails claiming suspicious account activity\n2. Redirection: Users click links leading to fake banking portals\n3. Credential Theft: Login credentials captured in real-time\n4. 2FA Bypass: Victims prompted to enter authentication codes\n5. Account Access: Attackers immediately access real accounts\n\nTECHNICAL INDICATORS:\n\n- Domains registered with privacy protection\n- SSL certificates from free certificate authorities\n- Hosting on bulletproof hosting providers\n- Real-time credential forwarding to attacker infrastructure\n\nTARGETED INSTITUTIONS:\n\n- Chase Bank\n- Bank of America\n- Wells Fargo\n- Citibank\n- Various credit unions\n\nPREVENTION MEASURES:\n\n1. Educate users about phishing indicators\n2. Implement email security solutions\n3. Use bookmark-based banking access\n4. Deploy advanced threat protection\n5. Monitor for domain impersonation",
    references: [
      "https://www.fbi.gov/scams-and-safety/common-scams-and-crimes/internet-fraud",
      "https://www.anti-phishing.org/resources/"
    ],
    cvss: 6.5,
    cveIds: [],
    publishedDate: new Date('2024-12-05'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: "IoT Botnet Mirai Variant Exploiting Default Credentials",
    description: "New variant of Mirai botnet discovered targeting IoT devices with expanded device support and improved persistence mechanisms.",
    summary: "Enhanced Mirai botnet variant targeting IoT devices with default credentials, capable of DDoS attacks and cryptocurrency mining.",
    severity: "Medium",
    category: "Botnet",
    iocs: [
      { type: "IP", value: "45.123.67.89", description: "Botnet command and control server" },
      { type: "Domain", value: "iot-update-service.tech", description: "Fake update service domain" },
      { type: "Hash", value: "abc789def123abc789def123abc789def123abc78", description: "Mirai variant binary hash" }
    ],
    author: "IOT-SECURITY-TEAM",
    tags: ["Mirai", "Botnet", "IoT", "DDoS", "Default Credentials"],
    content: "BOTNET ANALYSIS:\n\nA new variant of the Mirai botnet has been identified with enhanced capabilities for targeting Internet of Things (IoT) devices. This variant expands the target device list and includes improved persistence mechanisms.\n\nTARGET DEVICES:\n\n- IP cameras and security systems\n- Smart home devices (thermostats, lights, locks)\n- Network-attached storage devices\n- Industrial IoT sensors\n- Smart TVs and streaming devices\n\nATTACK VECTORS:\n\n1. Scanning for devices with default credentials\n2. Exploiting known IoT vulnerabilities\n3. Brute-force attacks on weak passwords\n4. Exploitation of unpatched firmware\n\nPAYLOAD CAPABILITIES:\n\n- DDoS attack participation\n- Cryptocurrency mining\n- Data theft from compromised devices\n- Lateral movement within networks\n- Self-propagation to new targets\n\nMITIGATION STRATEGIES:\n\n1. Change default credentials on all IoT devices\n2. Implement network segmentation for IoT devices\n3. Regular firmware updates and patch management\n4. Monitor network traffic for botnet communications\n5. Deploy IoT-specific security solutions",
    references: [
      "https://www.us-cert.gov/ncas/alerts/TA16-288A",
      "https://krebsonsecurity.com/tag/mirai-botnet/"
    ],
    cvss: 5.8,
    cveIds: [],
    publishedDate: new Date('2024-12-03'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function populateDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('threat-advisory');
    const collection = db.collection('advisories');
    
    // Clear existing data
    await collection.deleteMany({});
    console.log('🗑️ Cleared existing advisories');
    
    // Insert sample data
    const result = await collection.insertMany(sampleAdvisories);
    console.log(`📊 Inserted ${result.insertedCount} sample advisories`);
    
    // Verify insertion
    const count = await collection.countDocuments();
    console.log(`✅ Total advisories in database: ${count}`);
    
    // Display summary
    console.log('\n📋 Sample Data Summary:');
    const severityCounts = await collection.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    severityCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count} advisories`);
    });
    
    console.log('\n🎉 Database population completed successfully!');
    console.log('🌐 You can now visit http://localhost:3002 to see the data');
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await client.close();
  }
}

populateDatabase();
