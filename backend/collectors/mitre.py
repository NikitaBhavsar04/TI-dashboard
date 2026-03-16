from typing import List, Dict, Tuple
from pathlib import Path
from utils.common import logger

# ============================================================
# TAXII (ENRICHMENT ONLY)
# ============================================================

try:
    from collectors.taxii_connector import MITRETAXIIConnector
    from collectors.mitre_config import (
        TAXII_DISCOVERY_URL,
        TAXII_API_ROOT,
        CACHE_DIR,
        COLLECTIONS,
    )
    MITRE_AVAILABLE = True
except Exception:
    logger.warning("[MITRE] TAXII unavailable – static logic only")
    MITRE_AVAILABLE = False
    CACHE_DIR = Path("./data/cache")


# ============================================================
# 1. STATIC ANALYST-CURATED TECHNIQUES (SOURCE OF TRUTH)
#    Only IDs listed here can ever be returned.
# ============================================================

STATIC_TTP_DETAILS: Dict[str, Tuple[str, str]] = {
    # -------------------------
    # INITIAL ACCESS (TA0001)
    # -------------------------
    "T1189": ("Initial Access", "Drive-by Compromise"),
    "T1190": ("Initial Access", "Exploit Public-Facing Application"),
    "T1091": ("Initial Access", "Replication Through Removable Media"),
    "T1133": ("Initial Access", "External Remote Services"),
    "T1199": ("Initial Access", "Trusted Relationship"),
    "T1200": ("Initial Access", "Hardware Additions"),
    "T1078": ("Initial Access", "Valid Accounts"),
    "T1078.001": ("Initial Access", "Default Accounts"),
    "T1078.002": ("Initial Access", "Domain Accounts"),
    "T1078.003": ("Initial Access", "Cloud Accounts"),
    "T1078.004": ("Initial Access", "Local Accounts"),
    "T1566": ("Initial Access", "Phishing"),
    "T1566.001": ("Initial Access", "Spearphishing Attachment"),
    "T1566.002": ("Initial Access", "Spearphishing Link"),
    "T1566.003": ("Initial Access", "Spearphishing via Service"),
    "T1566.004": ("Initial Access", "Spearphishing Voice"),
    "T1195": ("Initial Access", "Supply Chain Compromise"),
    "T1195.001": ("Initial Access", "Compromise Software Dependencies and Development Tools"),
    "T1195.002": ("Initial Access", "Compromise Software Supply Chain"),
    "T1195.003": ("Initial Access", "Compromise Hardware Supply Chain"),

    # -------------------------
    # EXECUTION (TA0002)
    # -------------------------
    "T1059": ("Execution", "Command and Scripting Interpreter"),
    "T1059.001": ("Execution", "PowerShell"),
    "T1059.002": ("Execution", "AppleScript"),
    "T1059.003": ("Execution", "Windows Command Shell"),
    "T1059.004": ("Execution", "Unix Shell"),
    "T1059.005": ("Execution", "Visual Basic"),
    "T1059.006": ("Execution", "Python"),
    "T1059.007": ("Execution", "JavaScript"),
    "T1059.008": ("Execution", "Network Device CLI"),
    "T1059.009": ("Execution", "Cloud API"),
    "T1053": ("Execution", "Scheduled Task/Job"),
    "T1053.003": ("Execution", "Cron"),
    "T1053.005": ("Execution", "Scheduled Task"),
    "T1053.006": ("Execution", "Systemd Timers"),
    "T1047": ("Execution", "Windows Management Instrumentation"),
    "T1106": ("Execution", "Native API"),
    "T1129": ("Execution", "Shared Modules"),
    "T1203": ("Execution", "Exploitation for Client Execution"),
    "T1204": ("Execution", "User Execution"),
    "T1204.001": ("Execution", "Malicious Link"),
    "T1204.002": ("Execution", "Malicious File"),
    "T1204.003": ("Execution", "Malicious Image"),
    "T1559": ("Execution", "Inter-Process Communication"),
    "T1559.001": ("Execution", "Component Object Model"),
    "T1559.002": ("Execution", "Dynamic Data Exchange"),
    "T1569": ("Execution", "System Services"),
    "T1569.001": ("Execution", "Launchctl"),
    "T1569.002": ("Execution", "Service Execution"),

    # -------------------------
    # PERSISTENCE (TA0003)
    # -------------------------
    "T1098": ("Persistence", "Account Manipulation"),
    "T1098.001": ("Persistence", "Additional Cloud Credentials"),
    "T1098.002": ("Persistence", "Additional Email Delegate Permissions"),
    "T1098.003": ("Persistence", "Additional Cloud Roles"),
    "T1098.004": ("Persistence", "SSH Authorized Keys"),
    "T1098.005": ("Persistence", "Device Registration"),
    "T1136": ("Persistence", "Create Account"),
    "T1136.001": ("Persistence", "Local Account"),
    "T1136.002": ("Persistence", "Domain Account"),
    "T1136.003": ("Persistence", "Cloud Account"),
    "T1137": ("Persistence", "Office Application Startup"),
    "T1137.001": ("Persistence", "Office Template Macros"),
    "T1176": ("Persistence", "Browser Extensions"),
    "T1197": ("Persistence", "BITS Jobs"),
    "T1205": ("Persistence", "Traffic Signaling"),
    "T1205.001": ("Persistence", "Port Knocking"),
    "T1542": ("Persistence", "Pre-OS Boot"),
    "T1542.003": ("Persistence", "Bootkit"),
    "T1543": ("Persistence", "Create or Modify System Process"),
    "T1543.001": ("Persistence", "Launch Agent"),
    "T1543.002": ("Persistence", "Systemd Service"),
    "T1543.003": ("Persistence", "Windows Service"),
    "T1543.004": ("Persistence", "Launch Daemon"),
    "T1546": ("Persistence", "Event Triggered Execution"),
    "T1546.003": ("Persistence", "Windows Management Instrumentation Event Subscription"),
    "T1546.011": ("Persistence", "Application Shimming"),
    "T1546.012": ("Persistence", "Image File Execution Options Injection"),
    "T1547": ("Persistence", "Boot or Logon Autostart Execution"),
    "T1547.001": ("Persistence", "Registry Run Keys / Startup Folder"),
    "T1547.003": ("Persistence", "Time Providers"),
    "T1547.004": ("Persistence", "Winlogon Helper DLL"),
    "T1547.006": ("Persistence", "Kernel Modules and Extensions"),
    "T1547.009": ("Persistence", "Shortcut Modification"),
    "T1547.014": ("Persistence", "Active Setup"),
    "T1554": ("Persistence", "Compromise Client Software Binary"),
    "T1574": ("Persistence", "Hijack Execution Flow"),
    "T1574.001": ("Persistence", "DLL Search Order Hijacking"),
    "T1574.002": ("Persistence", "DLL Side-Loading"),
    "T1574.006": ("Persistence", "Dynamic Linker Hijacking"),

    # -------------------------
    # PRIVILEGE ESCALATION (TA0004)
    # -------------------------
    "T1055": ("Privilege Escalation", "Process Injection"),
    "T1055.001": ("Privilege Escalation", "Dynamic-link Library Injection"),
    "T1055.002": ("Privilege Escalation", "Portable Executable Injection"),
    "T1055.003": ("Privilege Escalation", "Thread Execution Hijacking"),
    "T1055.004": ("Privilege Escalation", "Asynchronous Procedure Call"),
    "T1055.011": ("Privilege Escalation", "Extra Window Memory Injection"),
    "T1055.012": ("Privilege Escalation", "Process Hollowing"),
    "T1055.013": ("Privilege Escalation", "Process Doppelganging"),
    "T1055.014": ("Privilege Escalation", "VDSO Hijacking"),
    "T1068": ("Privilege Escalation", "Exploitation for Privilege Escalation"),
    "T1078": ("Privilege Escalation", "Valid Accounts"),
    "T1134": ("Privilege Escalation", "Access Token Manipulation"),
    "T1134.001": ("Privilege Escalation", "Token Impersonation/Theft"),
    "T1134.002": ("Privilege Escalation", "Create Process with Token"),
    "T1134.003": ("Privilege Escalation", "Make and Impersonate Token"),
    "T1134.004": ("Privilege Escalation", "Parent PID Spoofing"),
    "T1134.005": ("Privilege Escalation", "SID-History Injection"),
    "T1548": ("Privilege Escalation", "Abuse Elevation Control Mechanism"),
    "T1548.001": ("Privilege Escalation", "Setuid and Setgid"),
    "T1548.002": ("Privilege Escalation", "Bypass User Account Control"),
    "T1548.003": ("Privilege Escalation", "Sudo and Sudo Caching"),
    "T1548.004": ("Privilege Escalation", "Elevated Execution with Prompt"),
    "T1611": ("Privilege Escalation", "Escape to Host"),

    # -------------------------
    # DEFENSE EVASION (TA0005)
    # -------------------------
    "T1014": ("Defense Evasion", "Rootkit"),
    "T1027": ("Defense Evasion", "Obfuscated Files or Information"),
    "T1027.001": ("Defense Evasion", "Binary Padding"),
    "T1027.002": ("Defense Evasion", "Software Packing"),
    "T1027.003": ("Defense Evasion", "Steganography"),
    "T1027.004": ("Defense Evasion", "Compile After Delivery"),
    "T1027.005": ("Defense Evasion", "Indicator Removal from Tools"),
    "T1027.006": ("Defense Evasion", "HTML Smuggling"),
    "T1027.007": ("Defense Evasion", "Dynamic API Resolution"),
    "T1027.009": ("Defense Evasion", "Embedded Payloads"),
    "T1027.010": ("Defense Evasion", "Command Obfuscation"),
    "T1036": ("Defense Evasion", "Masquerading"),
    "T1036.001": ("Defense Evasion", "Invalid Code Signature"),
    "T1036.003": ("Defense Evasion", "Rename System Utilities"),
    "T1036.004": ("Defense Evasion", "Masquerade Task or Service"),
    "T1036.005": ("Defense Evasion", "Match Legitimate Name or Location"),
    "T1036.006": ("Defense Evasion", "Space after Filename"),
    "T1055": ("Defense Evasion", "Process Injection"),
    "T1070": ("Defense Evasion", "Indicator Removal"),
    "T1070.001": ("Defense Evasion", "Clear Windows Event Logs"),
    "T1070.002": ("Defense Evasion", "Clear Linux or Mac System Logs"),
    "T1070.003": ("Defense Evasion", "Clear Command History"),
    "T1070.004": ("Defense Evasion", "File Deletion"),
    "T1070.006": ("Defense Evasion", "Timestomp"),
    "T1112": ("Defense Evasion", "Modify Registry"),
    "T1127": ("Defense Evasion", "Trusted Developer Utilities Proxy Execution"),
    "T1127.001": ("Defense Evasion", "MSBuild"),
    "T1140": ("Defense Evasion", "Deobfuscate/Decode Files or Information"),
    "T1202": ("Defense Evasion", "Indirect Command Execution"),
    "T1211": ("Defense Evasion", "Exploitation for Defense Evasion"),
    "T1218": ("Defense Evasion", "System Binary Proxy Execution"),
    "T1218.001": ("Defense Evasion", "Compiled HTML File"),
    "T1218.003": ("Defense Evasion", "CMSTP"),
    "T1218.005": ("Defense Evasion", "Mshta"),
    "T1218.007": ("Defense Evasion", "Msiexec"),
    "T1218.008": ("Defense Evasion", "Odbcconf"),
    "T1218.010": ("Defense Evasion", "Regsvr32"),
    "T1218.011": ("Defense Evasion", "Rundll32"),
    "T1497": ("Defense Evasion", "Virtualization/Sandbox Evasion"),
    "T1497.001": ("Defense Evasion", "System Checks"),
    "T1553": ("Defense Evasion", "Subvert Trust Controls"),
    "T1553.002": ("Defense Evasion", "Code Signing"),
    "T1562": ("Defense Evasion", "Impair Defenses"),
    "T1562.001": ("Defense Evasion", "Disable or Modify Tools"),
    "T1562.002": ("Defense Evasion", "Disable Windows Event Logging"),
    "T1562.003": ("Defense Evasion", "Impair Command History Logging"),
    "T1562.004": ("Defense Evasion", "Disable or Modify System Firewall"),
    "T1562.006": ("Defense Evasion", "Indicator Blocking"),
    "T1564": ("Defense Evasion", "Hide Artifacts"),
    "T1564.001": ("Defense Evasion", "Hidden Files and Directories"),
    "T1564.003": ("Defense Evasion", "Hidden Window"),
    "T1620": ("Defense Evasion", "Reflective Code Loading"),

    # -------------------------
    # CREDENTIAL ACCESS (TA0006)
    # -------------------------
    "T1003": ("Credential Access", "OS Credential Dumping"),
    "T1003.001": ("Credential Access", "LSASS Memory"),
    "T1003.002": ("Credential Access", "Security Account Manager"),
    "T1003.003": ("Credential Access", "NTDS"),
    "T1003.004": ("Credential Access", "LSA Secrets"),
    "T1003.005": ("Credential Access", "Cached Domain Credentials"),
    "T1003.008": ("Credential Access", "/etc/passwd and /etc/shadow"),
    "T1055": ("Credential Access", "Process Injection"),
    "T1056": ("Credential Access", "Input Capture"),
    "T1056.001": ("Credential Access", "Keylogging"),
    "T1056.002": ("Credential Access", "GUI Input Capture"),
    "T1110": ("Credential Access", "Brute Force"),
    "T1110.001": ("Credential Access", "Password Guessing"),
    "T1110.002": ("Credential Access", "Password Cracking"),
    "T1110.003": ("Credential Access", "Password Spraying"),
    "T1110.004": ("Credential Access", "Credential Stuffing"),
    "T1111": ("Credential Access", "Multi-Factor Authentication Interception"),
    "T1187": ("Credential Access", "Forced Authentication"),
    "T1212": ("Credential Access", "Exploitation for Credential Access"),
    "T1528": ("Credential Access", "Steal Application Access Token"),
    "T1539": ("Credential Access", "Steal Web Session Cookie"),
    "T1555": ("Credential Access", "Credentials from Password Stores"),
    "T1555.001": ("Credential Access", "Keychain"),
    "T1555.003": ("Credential Access", "Credentials from Web Browsers"),
    "T1555.004": ("Credential Access", "Windows Credential Manager"),
    "T1555.005": ("Credential Access", "Password Managers"),
    "T1557": ("Credential Access", "Adversary-in-the-Middle"),
    "T1557.001": ("Credential Access", "LLMNR/NBT-NS Poisoning and SMB Relay"),
    "T1557.002": ("Credential Access", "ARP Cache Poisoning"),
    "T1558": ("Credential Access", "Steal or Forge Kerberos Tickets"),
    "T1558.001": ("Credential Access", "Golden Ticket"),
    "T1558.002": ("Credential Access", "Silver Ticket"),
    "T1558.003": ("Credential Access", "Kerberoasting"),
    "T1558.004": ("Credential Access", "AS-REP Roasting"),
    "T1606": ("Credential Access", "Forge Web Credentials"),
    "T1606.001": ("Credential Access", "Web Cookies"),

    # -------------------------
    # DISCOVERY (TA0007)
    # -------------------------
    "T1007": ("Discovery", "System Service Discovery"),
    "T1010": ("Discovery", "Application Window Discovery"),
    "T1012": ("Discovery", "Query Registry"),
    "T1016": ("Discovery", "System Network Configuration Discovery"),
    "T1016.001": ("Discovery", "Internet Connection Discovery"),
    "T1018": ("Discovery", "Remote System Discovery"),
    "T1033": ("Discovery", "System Owner/User Discovery"),
    "T1040": ("Discovery", "Network Sniffing"),
    "T1046": ("Discovery", "Network Service Discovery"),
    "T1049": ("Discovery", "System Network Connections Discovery"),
    "T1057": ("Discovery", "Process Discovery"),
    "T1069": ("Discovery", "Permission Groups Discovery"),
    "T1069.001": ("Discovery", "Local Groups"),
    "T1069.002": ("Discovery", "Domain Groups"),
    "T1069.003": ("Discovery", "Cloud Groups"),
    "T1082": ("Discovery", "System Information Discovery"),
    "T1083": ("Discovery", "File and Directory Discovery"),
    "T1087": ("Discovery", "Account Discovery"),
    "T1087.001": ("Discovery", "Local Account"),
    "T1087.002": ("Discovery", "Domain Account"),
    "T1087.003": ("Discovery", "Email Account"),
    "T1087.004": ("Discovery", "Cloud Account"),
    "T1120": ("Discovery", "Peripheral Device Discovery"),
    "T1124": ("Discovery", "System Time Discovery"),
    "T1135": ("Discovery", "Network Share Discovery"),
    "T1201": ("Discovery", "Password Policy Discovery"),
    "T1217": ("Discovery", "Browser Information Discovery"),
    "T1518": ("Discovery", "Software Discovery"),
    "T1518.001": ("Discovery", "Security Software Discovery"),
    "T1526": ("Discovery", "Cloud Service Discovery"),
    "T1580": ("Discovery", "Cloud Infrastructure Discovery"),
    "T1614": ("Discovery", "System Location Discovery"),

    # -------------------------
    # LATERAL MOVEMENT (TA0008)
    # -------------------------
    "T1021": ("Lateral Movement", "Remote Services"),
    "T1021.001": ("Lateral Movement", "Remote Desktop Protocol"),
    "T1021.002": ("Lateral Movement", "SMB/Windows Admin Shares"),
    "T1021.004": ("Lateral Movement", "SSH"),
    "T1021.005": ("Lateral Movement", "VNC"),
    "T1021.006": ("Lateral Movement", "Windows Remote Management"),
    "T1072": ("Lateral Movement", "Software Deployment Tools"),
    "T1080": ("Lateral Movement", "Taint Shared Content"),
    "T1534": ("Lateral Movement", "Internal Spearphishing"),
    "T1550": ("Lateral Movement", "Use Alternate Authentication Material"),
    "T1550.001": ("Lateral Movement", "Application Access Token"),
    "T1550.002": ("Lateral Movement", "Pass the Hash"),
    "T1550.003": ("Lateral Movement", "Pass the Ticket"),
    "T1550.004": ("Lateral Movement", "Web Session Cookie"),
    "T1563": ("Lateral Movement", "Remote Service Session Hijacking"),
    "T1563.001": ("Lateral Movement", "SSH Hijacking"),
    "T1563.002": ("Lateral Movement", "RDP Hijacking"),
    "T1570": ("Lateral Movement", "Lateral Tool Transfer"),

    # -------------------------
    # COLLECTION (TA0009)
    # -------------------------
    "T1005": ("Collection", "Data from Local System"),
    "T1025": ("Collection", "Data from Removable Media"),
    "T1039": ("Collection", "Data from Network Shared Drive"),
    "T1074": ("Collection", "Data Staged"),
    "T1074.001": ("Collection", "Local Data Staging"),
    "T1074.002": ("Collection", "Remote Data Staging"),
    "T1113": ("Collection", "Screen Capture"),
    "T1114": ("Collection", "Email Collection"),
    "T1114.001": ("Collection", "Local Email Collection"),
    "T1114.002": ("Collection", "Remote Email Collection"),
    "T1114.003": ("Collection", "Email Forwarding Rule"),
    "T1115": ("Collection", "Clipboard Data"),
    "T1119": ("Collection", "Automated Collection"),
    "T1123": ("Collection", "Audio Capture"),
    "T1125": ("Collection", "Video Capture"),
    "T1185": ("Collection", "Browser Session Hijacking"),
    "T1213": ("Collection", "Data from Information Repositories"),
    "T1213.001": ("Collection", "Confluence"),
    "T1213.002": ("Collection", "Sharepoint"),
    "T1213.003": ("Collection", "Code Repositories"),
    "T1530": ("Collection", "Data from Cloud Storage"),
    "T1602": ("Collection", "Data from Configuration Repository"),

    # -------------------------
    # EXFILTRATION (TA0010)
    # -------------------------
    "T1020": ("Exfiltration", "Automated Exfiltration"),
    "T1029": ("Exfiltration", "Scheduled Transfer"),
    "T1030": ("Exfiltration", "Data Transfer Size Limits"),
    "T1041": ("Exfiltration", "Exfiltration Over C2 Channel"),
    "T1048": ("Exfiltration", "Exfiltration Over Alternative Protocol"),
    "T1048.001": ("Exfiltration", "Exfiltration Over Symmetric Encrypted Non-C2 Protocol"),
    "T1048.002": ("Exfiltration", "Exfiltration Over Asymmetric Encrypted Non-C2 Protocol"),
    "T1048.003": ("Exfiltration", "Exfiltration Over Unencrypted Non-C2 Protocol"),
    "T1052": ("Exfiltration", "Exfiltration Over Physical Medium"),
    "T1052.001": ("Exfiltration", "Exfiltration over USB"),
    "T1567": ("Exfiltration", "Exfiltration Over Web Service"),
    "T1567.001": ("Exfiltration", "Exfiltration to Code Repository"),
    "T1567.002": ("Exfiltration", "Exfiltration to Cloud Storage"),
    "T1567.003": ("Exfiltration", "Exfiltration to Text Storage Sites"),
    "T1567.004": ("Exfiltration", "Exfiltration Over Webhook"),

    # -------------------------
    # COMMAND AND CONTROL (TA0011)
    # -------------------------
    "T1008": ("Command and Control", "Fallback Channels"),
    "T1071": ("Command and Control", "Application Layer Protocol"),
    "T1071.001": ("Command and Control", "Web Protocols"),
    "T1071.002": ("Command and Control", "File Transfer Protocols"),
    "T1071.003": ("Command and Control", "Mail Protocols"),
    "T1071.004": ("Command and Control", "DNS"),
    "T1090": ("Command and Control", "Proxy"),
    "T1090.001": ("Command and Control", "Internal Proxy"),
    "T1090.002": ("Command and Control", "External Proxy"),
    "T1090.003": ("Command and Control", "Multi-hop Proxy"),
    "T1090.004": ("Command and Control", "Domain Fronting"),
    "T1092": ("Command and Control", "Communication Through Removable Media"),
    "T1095": ("Command and Control", "Non-Application Layer Protocol"),
    "T1102": ("Command and Control", "Web Service"),
    "T1102.001": ("Command and Control", "Dead Drop Resolver"),
    "T1102.002": ("Command and Control", "Bidirectional Communication"),
    "T1104": ("Command and Control", "Multi-Stage Channels"),
    "T1105": ("Command and Control", "Ingress Tool Transfer"),
    "T1132": ("Command and Control", "Data Encoding"),
    "T1132.001": ("Command and Control", "Standard Encoding"),
    "T1132.002": ("Command and Control", "Non-Standard Encoding"),
    "T1568": ("Command and Control", "Dynamic Resolution"),
    "T1568.001": ("Command and Control", "Fast Flux DNS"),
    "T1568.002": ("Command and Control", "Domain Generation Algorithms"),
    "T1571": ("Command and Control", "Non-Standard Port"),
    "T1572": ("Command and Control", "Protocol Tunneling"),
    "T1573": ("Command and Control", "Encrypted Channel"),
    "T1573.001": ("Command and Control", "Symmetric Cryptography"),
    "T1573.002": ("Command and Control", "Asymmetric Cryptography"),

    # -------------------------
    # IMPACT (TA0040)
    # -------------------------
    "T1485": ("Impact", "Data Destruction"),
    "T1486": ("Impact", "Data Encrypted for Impact"),
    "T1489": ("Impact", "Service Stop"),
    "T1490": ("Impact", "Inhibit System Recovery"),
    "T1491": ("Impact", "Defacement"),
    "T1491.001": ("Impact", "Internal Defacement"),
    "T1491.002": ("Impact", "External Website Defacement"),
    "T1495": ("Impact", "Firmware Corruption"),
    "T1496": ("Impact", "Resource Hijacking"),
    "T1498": ("Impact", "Network Denial of Service"),
    "T1498.001": ("Impact", "Direct Network Flood"),
    "T1498.002": ("Impact", "Reflection Amplification"),
    "T1499": ("Impact", "Endpoint Denial of Service"),
    "T1499.001": ("Impact", "OS Exhaustion Flood"),
    "T1499.002": ("Impact", "Service Exhaustion Flood"),
    "T1499.003": ("Impact", "Application Exhaustion Flood"),
    "T1499.004": ("Impact", "Application or System Exploitation"),
    "T1529": ("Impact", "System Shutdown/Reboot"),
    "T1531": ("Impact", "Account Access Removal"),
    "T1561": ("Impact", "Disk Wipe"),
    "T1561.001": ("Impact", "Disk Content Wipe"),
    "T1561.002": ("Impact", "Disk Structure Wipe"),
    "T1657": ("Impact", "Financial Theft"),

    # -------------------------
    # RECONNAISSANCE (TA0043)
    # -------------------------
    "T1589": ("Reconnaissance", "Gather Victim Identity Information"),
    "T1589.001": ("Reconnaissance", "Credentials"),
    "T1589.002": ("Reconnaissance", "Email Addresses"),
    "T1589.003": ("Reconnaissance", "Employee Names"),
    "T1590": ("Reconnaissance", "Gather Victim Network Information"),
    "T1590.001": ("Reconnaissance", "Domain Properties"),
    "T1590.002": ("Reconnaissance", "DNS"),
    "T1590.004": ("Reconnaissance", "Network Topology"),
    "T1590.005": ("Reconnaissance", "IP Addresses"),
    "T1590.006": ("Reconnaissance", "Network Security Appliances"),
    "T1591": ("Reconnaissance", "Gather Victim Org Information"),
    "T1591.001": ("Reconnaissance", "Determine Physical Locations"),
    "T1591.002": ("Reconnaissance", "Business Relationships"),
    "T1591.004": ("Reconnaissance", "Identify Roles"),
    "T1592": ("Reconnaissance", "Gather Victim Host Information"),
    "T1592.001": ("Reconnaissance", "Hardware"),
    "T1592.002": ("Reconnaissance", "Software"),
    "T1592.004": ("Reconnaissance", "Client Configurations"),
    "T1593": ("Reconnaissance", "Search Open Websites/Domains"),
    "T1593.001": ("Reconnaissance", "Social Media"),
    "T1593.002": ("Reconnaissance", "Search Engines"),
    "T1594": ("Reconnaissance", "Search Victim-Owned Websites"),
    "T1595": ("Reconnaissance", "Active Scanning"),
    "T1595.001": ("Reconnaissance", "Scanning IP Blocks"),
    "T1595.002": ("Reconnaissance", "Vulnerability Scanning"),
    "T1595.003": ("Reconnaissance", "Wordlist Scanning"),
    "T1596": ("Reconnaissance", "Search Open Technical Databases"),
    "T1596.001": ("Reconnaissance", "DNS/Passive DNS"),
    "T1596.002": ("Reconnaissance", "WHOIS"),
    "T1596.005": ("Reconnaissance", "Scan Databases"),
    "T1597": ("Reconnaissance", "Search Closed Sources"),
    "T1598": ("Reconnaissance", "Phishing for Information"),
    "T1598.001": ("Reconnaissance", "Spearphishing Service"),
    "T1598.002": ("Reconnaissance", "Spearphishing Attachment"),
    "T1598.003": ("Reconnaissance", "Spearphishing Link"),

    # -------------------------
    # RESOURCE DEVELOPMENT (TA0042)
    # -------------------------
    "T1583": ("Resource Development", "Acquire Infrastructure"),
    "T1583.001": ("Resource Development", "Domains"),
    "T1583.003": ("Resource Development", "Virtual Private Server"),
    "T1583.004": ("Resource Development", "Server"),
    "T1583.006": ("Resource Development", "Web Services"),
    "T1584": ("Resource Development", "Compromise Infrastructure"),
    "T1584.001": ("Resource Development", "Domains"),
    "T1584.004": ("Resource Development", "Server"),
    "T1585": ("Resource Development", "Establish Accounts"),
    "T1585.001": ("Resource Development", "Social Media Accounts"),
    "T1585.002": ("Resource Development", "Email Accounts"),
    "T1586": ("Resource Development", "Compromise Accounts"),
    "T1586.001": ("Resource Development", "Social Media Accounts"),
    "T1586.002": ("Resource Development", "Email Accounts"),
    "T1587": ("Resource Development", "Develop Capabilities"),
    "T1587.001": ("Resource Development", "Malware"),
    "T1587.002": ("Resource Development", "Code Signing Certificates"),
    "T1587.003": ("Resource Development", "Digital Certificates"),
    "T1587.004": ("Resource Development", "Exploits"),
    "T1588": ("Resource Development", "Obtain Capabilities"),
    "T1588.001": ("Resource Development", "Malware"),
    "T1588.002": ("Resource Development", "Tool"),
    "T1588.005": ("Resource Development", "Exploits"),
    "T1588.006": ("Resource Development", "Vulnerabilities"),
    "T1608": ("Resource Development", "Stage Capabilities"),
    "T1608.001": ("Resource Development", "Upload Malware"),
    "T1608.006": ("Resource Development", "SEO Poisoning"),
}


# ============================================================
# 2. ATTACK VECTOR INFERENCE (CRITICAL)
#    Initial access routing: network / file / user / unknown
# ============================================================

def _infer_attack_vector(text: str) -> str:
    """
    Determine how initial access likely occurs.
    Prevents incorrect T1190 usage by differentiating
    network-facing exploits vs file/user-driven execution.
    """
    text = text.lower()

    if any(k in text for k in [
        "http", "https", "api", "web", "endpoint",
        "unauthenticated", "exposed", "public-facing",
        "vpn", "rdp", "proxy", "reverse shell"
    ]):
        return "network"

    if any(k in text for k in [
        "email", "phishing", "attachment",
        "document", "office", "macro", "vbscript",
        "pdf", "image", "jpg", "png", "xlm"
    ]):
        return "file"

    if any(k in text for k in [
        "user opens", "user clicked", "double click",
        "manual execution", "user executed"
    ]):
        return "user"

    return "unknown"


# ============================================================
# 3. CONTEXT-AWARE HEURISTIC RULES
#    Mapping from keywords -> {vector|any -> [technique IDs]}
#    All IDs must exist in STATIC_TTP_DETAILS.
# ============================================================

HEURISTIC_RULES: Dict[str, Dict[str, List[str]]] = {
    # -------------------------
    # Remote Code Execution
    # -------------------------
    "rce": {
        "network": ["T1190", "T1059"],
        "file": ["T1204", "T1059"],
        "user": ["T1204", "T1059"],
    },
    "remote code execution": {
        "network": ["T1190", "T1059"],
        "file": ["T1204", "T1059"],
        "user": ["T1204", "T1059"],
    },
    "exploit": {
        "network": ["T1190", "T1068"],
        "file": ["T1204.002", "T1068"],
    },

    # -------------------------
    # Phishing / Email
    # -------------------------
    "phishing": {
        "any": ["T1566"],
    },
    "spearphishing": {
        "any": ["T1566.001", "T1566.002"],
    },
    "email attachment": {
        "any": ["T1566.001", "T1204.002"],
    },
    "email link": {
        "any": ["T1566.002"],
    },

    # -------------------------
    # Credentials
    # -------------------------
    "credential": {
        "any": ["T1555", "T1003"],
    },
    "password": {
        "any": ["T1555", "T1110"],
    },
    "brute force": {
        "any": ["T1110.001"],
    },
    "password spray": {
        "any": ["T1110.003"],
    },
    "lsass": {
        "any": ["T1003.001"],
    },
    "sam hive": {
        "any": ["T1003.002"],
    },
    "ntds.dit": {
        "any": ["T1003.003"],
    },
    "browser credential": {
        "any": ["T1555.003"],
    },

    # -------------------------
    # Privilege Escalation
    # -------------------------
    "privilege escalation": {
        "any": ["T1068"],
    },
    "uac bypass": {
        "any": ["T1548.002"],
    },
    "elevation": {
        "any": ["T1068", "T1548"],
    },

    # -------------------------
    # Persistence
    # -------------------------
    "persistence": {
        "any": ["T1547"],
    },
    "run key": {
        "any": ["T1547.001"],
    },
    "startup folder": {
        "any": ["T1547.001"],
    },
    "winlogon": {
        "any": ["T1547.004"],
    },
    "shortcut": {
        "any": ["T1547.009"],
    },
    "scheduled task": {
        "any": ["T1053", "T1053.005"],
    },
    "cron": {
        "any": ["T1053.003"],
    },
    "create account": {
        "any": ["T1136"],
    },

    # -------------------------
    # Discovery
    # -------------------------
    "network scan": {
        "any": ["T1046"],
    },
    "port scan": {
        "any": ["T1046"],
    },
    "systeminfo": {
        "any": ["T1082"],
    },
    "ipconfig": {
        "any": ["T1049"],
    },

    # -------------------------
    # Lateral Movement / Remote Services
    # -------------------------
    "lateral movement": {
        "any": ["T1021"],
    },
    "rdp": {
        "any": ["T1021.001"],
    },
    "smb": {
        "any": ["T1021.002"],
    },
    "ssh": {
        "any": ["T1021.004"],
    },
    "winrm": {
        "any": ["T1021.006"],
    },

    # -------------------------
    # Execution specifics
    # -------------------------
    "powershell": {
        "any": ["T1059.001"],
    },
    "cmd.exe": {
        "any": ["T1059.003"],
    },
    "bash": {
        "any": ["T1059.004"],
    },
    "python": {
        "any": ["T1059.006"],
    },
    "wmi": {
        "any": ["T1047"],
    },
    "process injection": {
        "any": ["T1055"],
    },

    # -------------------------
    # Defense Evasion
    # -------------------------
    "obfuscate": {
        "any": ["T1027"],
    },
    "packed": {
        "any": ["T1027"],
    },
    "masquerade": {
        "any": ["T1036"],
    },
    "svchost.exe": {
        "any": ["T1036.005"],
    },
    "clear logs": {
        "any": ["T1070.001"],
    },
    "delete log": {
        "any": ["T1070.001"],
    },
    "log deletion": {
        "any": ["T1070.001"],
    },
    "file deletion": {
        "any": ["T1070.004"],
    },
    "disable av": {
        "any": ["T1562.001"],
    },
    "disable edr": {
        "any": ["T1562.001"],
    },
    "disable firewall": {
        "any": ["T1562.004"],
    },

    # -------------------------
    # Command and Control
    # -------------------------
    "c2": {
        "any": ["T1071", "T1105"],
    },
    "command and control": {
        "any": ["T1071"],
    },
    "http beacon": {
        "any": ["T1071.001"],
    },
    "https beacon": {
        "any": ["T1071.001"],
    },
    "ftp exfil": {
        "any": ["T1071.002"],
    },
    "reverse shell": {
        "any": ["T1095"],
    },
    "tool transfer": {
        "any": ["T1105"],
    },

    # -------------------------
    # Impact
    # -------------------------
    "ransomware": {
        "any": ["T1486", "T1490"],
    },
    "encrypt": {
        "any": ["T1486"],
    },
    "inhibit recovery": {
        "any": ["T1490"],
    },
    "service stop": {
        "any": ["T1489"],
    },
    "denial of service": {
        "any": ["T1499", "T1498"],
    },
    "dos": {
        "any": ["T1499"],
    },
    "ddos": {
        "any": ["T1498", "T1498.001", "T1498.002"],
    },
    "network flood": {
        "any": ["T1498.001"],
    },
    "reflection amplification": {
        "any": ["T1498.002"],
    },
    "data destruction": {
        "any": ["T1485"],
    },
    "disk wipe": {
        "any": ["T1561", "T1561.001", "T1561.002"],
    },
    "wiper": {
        "any": ["T1485", "T1561"],
    },
    "defacement": {
        "any": ["T1491"],
    },
    "website defacement": {
        "any": ["T1491.002"],
    },
    "resource hijacking": {
        "any": ["T1496"],
    },
    "cryptomining": {
        "any": ["T1496"],
    },
    "coin miner": {
        "any": ["T1496"],
    },
    "system shutdown": {
        "any": ["T1529"],
    },
    "account lockout": {
        "any": ["T1531"],
    },
    "firmware": {
        "any": ["T1495", "T1542.003"],
    },

    # -------------------------
    # Execution additions
    # -------------------------
    "vbscript": {
        "any": ["T1059.005"],
    },
    "vba macro": {
        "any": ["T1059.005", "T1137.001"],
    },
    "javascript": {
        "any": ["T1059.007"],
    },
    "jscript": {
        "any": ["T1059.007"],
    },
    "native api": {
        "any": ["T1106"],
    },
    "exploitation for client": {
        "any": ["T1203"],
    },
    "client-side exploit": {
        "any": ["T1203"],
    },
    "malicious document": {
        "file": ["T1204.002", "T1566.001"],
    },
    "malicious macro": {
        "file": ["T1137.001", "T1059.005"],
    },
    "service execution": {
        "any": ["T1569.002"],
    },
    "com object": {
        "any": ["T1559.001"],
    },
    "dde": {
        "any": ["T1559.002"],
    },

    # -------------------------
    # Persistence additions
    # -------------------------
    "account manipulation": {
        "any": ["T1098"],
    },
    "ssh authorized keys": {
        "any": ["T1098.004"],
    },
    "cloud credential": {
        "any": ["T1098.001"],
    },
    "bits job": {
        "any": ["T1197"],
    },
    "bits jobs": {
        "any": ["T1197"],
    },
    "browser extension": {
        "any": ["T1176"],
    },
    "office addin": {
        "any": ["T1137"],
    },
    "office template": {
        "any": ["T1137.001"],
    },
    "windows service": {
        "any": ["T1543.003"],
    },
    "systemd service": {
        "any": ["T1543.002"],
    },
    "launch agent": {
        "any": ["T1543.001"],
    },
    "wmi subscription": {
        "any": ["T1546.003"],
    },
    "wmi event": {
        "any": ["T1546.003"],
    },
    "application shim": {
        "any": ["T1546.011"],
    },
    "image file execution": {
        "any": ["T1546.012"],
    },
    "ifeo": {
        "any": ["T1546.012"],
    },
    "dll hijacking": {
        "any": ["T1574.001"],
    },
    "dll side-loading": {
        "any": ["T1574.002"],
    },
    "dll sideloading": {
        "any": ["T1574.002"],
    },
    "supply chain": {
        "any": ["T1195", "T1195.002"],
    },
    "bootkit": {
        "any": ["T1542.003"],
    },
    "kernel module": {
        "any": ["T1547.006"],
    },
    "time provider": {
        "any": ["T1547.003"],
    },
    "active setup": {
        "any": ["T1547.014"],
    },
    "trusted relationship": {
        "any": ["T1199"],
    },
    "third party": {
        "any": ["T1199"],
    },
    "removable media": {
        "any": ["T1091", "T1025", "T1052.001"],
    },
    "usb": {
        "any": ["T1091", "T1052.001"],
    },

    # -------------------------
    # Privilege Escalation additions
    # -------------------------
    "access token": {
        "any": ["T1134"],
    },
    "token impersonation": {
        "any": ["T1134.001"],
    },
    "token theft": {
        "any": ["T1134.001"],
    },
    "make token": {
        "any": ["T1134.003"],
    },
    "ppid spoofing": {
        "any": ["T1134.004"],
    },
    "parent pid": {
        "any": ["T1134.004"],
    },
    "sid history": {
        "any": ["T1134.005"],
    },
    "setuid": {
        "any": ["T1548.001"],
    },
    "setgid": {
        "any": ["T1548.001"],
    },
    "sudo": {
        "any": ["T1548.003"],
    },
    "container escape": {
        "any": ["T1611"],
    },
    "docker escape": {
        "any": ["T1611"],
    },

    # -------------------------
    # Defense Evasion additions
    # -------------------------
    "rootkit": {
        "any": ["T1014"],
    },
    "binary padding": {
        "any": ["T1027.001"],
    },
    "software packing": {
        "any": ["T1027.002"],
    },
    "packer": {
        "any": ["T1027.002"],
    },
    "upx": {
        "any": ["T1027.002"],
    },
    "steganography": {
        "any": ["T1027.003"],
    },
    "compile after delivery": {
        "any": ["T1027.004"],
    },
    "html smuggling": {
        "any": ["T1027.006"],
    },
    "dynamic api": {
        "any": ["T1027.007"],
    },
    "command obfuscation": {
        "any": ["T1027.010"],
    },
    "living off the land": {
        "any": ["T1218", "T1127"],
    },
    "lolbas": {
        "any": ["T1218", "T1127"],
    },
    "rename utility": {
        "any": ["T1036.003"],
    },
    "timestomp": {
        "any": ["T1070.006"],
    },
    "timestamp modification": {
        "any": ["T1070.006"],
    },
    "clear command history": {
        "any": ["T1070.003"],
    },
    "history deletion": {
        "any": ["T1070.003"],
    },
    "modify registry": {
        "any": ["T1112"],
    },
    "registry modification": {
        "any": ["T1112"],
    },
    "msbuild": {
        "any": ["T1127.001"],
    },
    "decode payload": {
        "any": ["T1140"],
    },
    "base64 decode": {
        "any": ["T1140"],
    },
    "mshta": {
        "any": ["T1218.005"],
    },
    "msiexec": {
        "any": ["T1218.007"],
    },
    "regsvr32": {
        "any": ["T1218.010"],
    },
    "rundll32": {
        "any": ["T1218.011"],
    },
    "sandbox evasion": {
        "any": ["T1497"],
    },
    "anti-sandbox": {
        "any": ["T1497"],
    },
    "anti-analysis": {
        "any": ["T1497"],
    },
    "code signing": {
        "any": ["T1553.002"],
    },
    "disable logging": {
        "any": ["T1562.002"],
    },
    "disable event log": {
        "any": ["T1562.002"],
    },
    "indicator blocking": {
        "any": ["T1562.006"],
    },
    "hidden file": {
        "any": ["T1564.001"],
    },
    "hidden directory": {
        "any": ["T1564.001"],
    },
    "hidden window": {
        "any": ["T1564.003"],
    },
    "reflective loading": {
        "any": ["T1620"],
    },
    "process hollowing": {
        "any": ["T1055.012"],
    },
    "dll injection": {
        "any": ["T1055.001"],
    },
    "process doppelganging": {
        "any": ["T1055.013"],
    },

    # -------------------------
    # Credential Access additions
    # -------------------------
    "lsa secrets": {
        "any": ["T1003.004"],
    },
    "cached credentials": {
        "any": ["T1003.005"],
    },
    "etc passwd": {
        "any": ["T1003.008"],
    },
    "etc shadow": {
        "any": ["T1003.008"],
    },
    "keylogging": {
        "any": ["T1056.001"],
    },
    "keylogger": {
        "any": ["T1056.001"],
    },
    "password cracking": {
        "any": ["T1110.002"],
    },
    "hashcat": {
        "any": ["T1110.002"],
    },
    "credential stuffing": {
        "any": ["T1110.004"],
    },
    "mfa bypass": {
        "any": ["T1111"],
    },
    "otp intercept": {
        "any": ["T1111"],
    },
    "forced authentication": {
        "any": ["T1187"],
    },
    "ntlm relay": {
        "any": ["T1557.001"],
    },
    "llmnr poisoning": {
        "any": ["T1557.001"],
    },
    "nbns poisoning": {
        "any": ["T1557.001"],
    },
    "arp poisoning": {
        "any": ["T1557.002"],
    },
    "responder": {
        "any": ["T1557.001"],
    },
    "golden ticket": {
        "any": ["T1558.001"],
    },
    "silver ticket": {
        "any": ["T1558.002"],
    },
    "kerberoasting": {
        "any": ["T1558.003"],
    },
    "asrep roasting": {
        "any": ["T1558.004"],
    },
    "as-rep": {
        "any": ["T1558.004"],
    },
    "web session cookie": {
        "any": ["T1539"],
    },
    "cookie theft": {
        "any": ["T1539"],
    },
    "steal token": {
        "any": ["T1528"],
    },
    "oauth token": {
        "any": ["T1528"],
    },
    "forge cookie": {
        "any": ["T1606.001"],
    },
    "windows credential manager": {
        "any": ["T1555.004"],
    },
    "password manager": {
        "any": ["T1555.005"],
    },

    # -------------------------
    # Discovery additions
    # -------------------------
    "query registry": {
        "any": ["T1012"],
    },
    "reg query": {
        "any": ["T1012"],
    },
    "account discovery": {
        "any": ["T1087"],
    },
    "net user": {
        "any": ["T1087.001", "T1069.001"],
    },
    "net group": {
        "any": ["T1087.002", "T1069.002"],
    },
    "domain user": {
        "any": ["T1087.002"],
    },
    "email account discovery": {
        "any": ["T1087.003"],
    },
    "file discovery": {
        "any": ["T1083"],
    },
    "dir /s": {
        "any": ["T1083"],
    },
    "find / -name": {
        "any": ["T1083"],
    },
    "process list": {
        "any": ["T1057"],
    },
    "tasklist": {
        "any": ["T1057"],
    },
    "ps aux": {
        "any": ["T1057"],
    },
    "group discovery": {
        "any": ["T1069"],
    },
    "local group": {
        "any": ["T1069.001"],
    },
    "domain group": {
        "any": ["T1069.002"],
    },
    "cloud group": {
        "any": ["T1069.003"],
    },
    "network share": {
        "any": ["T1135"],
    },
    "net share": {
        "any": ["T1135"],
    },
    "password policy": {
        "any": ["T1201"],
    },
    "security software": {
        "any": ["T1518.001"],
    },
    "antivirus detection": {
        "any": ["T1518.001"],
    },
    "network sniffing": {
        "any": ["T1040"],
    },
    "packet capture": {
        "any": ["T1040"],
    },
    "pcap": {
        "any": ["T1040"],
    },
    "whoami": {
        "any": ["T1033"],
    },
    "system owner": {
        "any": ["T1033"],
    },
    "arp -a": {
        "any": ["T1018"],
    },
    "ifconfig": {
        "any": ["T1016"],
    },
    "system time": {
        "any": ["T1124"],
    },
    "service discovery": {
        "any": ["T1007"],
    },
    "sc query": {
        "any": ["T1007"],
    },
    "cloud discovery": {
        "any": ["T1526", "T1580"],
    },
    "system location": {
        "any": ["T1614"],
    },
    "geolocation": {
        "any": ["T1614"],
    },
    "browser history": {
        "any": ["T1217"],
    },
    "peripheral device": {
        "any": ["T1120"],
    },

    # -------------------------
    # Lateral Movement additions
    # -------------------------
    "pass the hash": {
        "any": ["T1550.002"],
    },
    "pth": {
        "any": ["T1550.002"],
    },
    "pass the ticket": {
        "any": ["T1550.003"],
    },
    "ptt": {
        "any": ["T1550.003"],
    },
    "overpass the hash": {
        "any": ["T1550.002"],
    },
    "ssh hijacking": {
        "any": ["T1563.001"],
    },
    "rdp hijacking": {
        "any": ["T1563.002"],
    },
    "vnc": {
        "any": ["T1021.005"],
    },
    "software deployment": {
        "any": ["T1072"],
    },
    "psexec": {
        "any": ["T1021.002", "T1569.002"],
    },
    "wmi exec": {
        "any": ["T1047"],
    },
    "internal spearphishing": {
        "any": ["T1534"],
    },
    "taint shared content": {
        "any": ["T1080"],
    },
    "lateral tool": {
        "any": ["T1570"],
    },

    # -------------------------
    # Collection additions
    # -------------------------
    "data collection": {
        "any": ["T1005"],
    },
    "data from local": {
        "any": ["T1005"],
    },
    "data staging": {
        "any": ["T1074"],
    },
    "screen capture": {
        "any": ["T1113"],
    },
    "screenshot": {
        "any": ["T1113"],
    },
    "email collection": {
        "any": ["T1114"],
    },
    "email forwarding": {
        "any": ["T1114.003"],
    },
    "clipboard": {
        "any": ["T1115"],
    },
    "automated collection": {
        "any": ["T1119"],
    },
    "audio capture": {
        "any": ["T1123"],
    },
    "video capture": {
        "any": ["T1125"],
    },
    "cloud storage": {
        "any": ["T1530"],
    },
    "s3 bucket": {
        "any": ["T1530"],
    },
    "sharepoint": {
        "any": ["T1213.002"],
    },
    "confluence": {
        "any": ["T1213.001"],
    },
    "git repository": {
        "any": ["T1213.003"],
    },
    "code repository": {
        "any": ["T1213.003"],
    },
    "network shared drive": {
        "any": ["T1039"],
    },

    # -------------------------
    # Exfiltration additions
    # -------------------------
    "exfiltration": {
        "any": ["T1041", "T1048"],
    },
    "data exfil": {
        "any": ["T1041", "T1048"],
    },
    "exfil over c2": {
        "any": ["T1041"],
    },
    "exfil over dns": {
        "any": ["T1048.003"],
    },
    "dns exfil": {
        "any": ["T1048.003"],
    },
    "exfil to cloud": {
        "any": ["T1567.002"],
    },
    "exfil to github": {
        "any": ["T1567.001"],
    },
    "scheduled transfer": {
        "any": ["T1029"],
    },
    "data transfer size": {
        "any": ["T1030"],
    },
    "automated exfil": {
        "any": ["T1020"],
    },
    "webhook exfil": {
        "any": ["T1567.004"],
    },
    "pastebin": {
        "any": ["T1567.003"],
    },

    # -------------------------
    # C2 additions
    # -------------------------
    "dns c2": {
        "any": ["T1071.004"],
    },
    "dns tunneling": {
        "any": ["T1071.004", "T1572"],
    },
    "smtp c2": {
        "any": ["T1071.003"],
    },
    "mail protocol": {
        "any": ["T1071.003"],
    },
    "proxy": {
        "any": ["T1090"],
    },
    "multi-hop proxy": {
        "any": ["T1090.003"],
    },
    "tor": {
        "any": ["T1090.003"],
    },
    "domain fronting": {
        "any": ["T1090.004"],
    },
    "cdn fronting": {
        "any": ["T1090.004"],
    },
    "web service c2": {
        "any": ["T1102"],
    },
    "dead drop": {
        "any": ["T1102.001"],
    },
    "multi-stage": {
        "any": ["T1104"],
    },
    "data encoding": {
        "any": ["T1132"],
    },
    "dga": {
        "any": ["T1568.002"],
    },
    "domain generation": {
        "any": ["T1568.002"],
    },
    "fast flux": {
        "any": ["T1568.001"],
    },
    "non-standard port": {
        "any": ["T1571"],
    },
    "protocol tunneling": {
        "any": ["T1572"],
    },
    "ssh tunnel": {
        "any": ["T1572"],
    },
    "encrypted channel": {
        "any": ["T1573"],
    },
    "tls c2": {
        "any": ["T1573.002"],
    },
    "fallback channel": {
        "any": ["T1008"],
    },

    # -------------------------
    # Reconnaissance additions
    # -------------------------
    "reconnaissance": {
        "any": ["T1595", "T1589"],
    },
    "active scanning": {
        "any": ["T1595"],
    },
    "vulnerability scanning": {
        "any": ["T1595.002"],
    },
    "ip block scan": {
        "any": ["T1595.001"],
    },
    "osint": {
        "any": ["T1589", "T1593"],
    },
    "social media recon": {
        "any": ["T1593.001"],
    },
    "google dork": {
        "any": ["T1593.002"],
    },
    "search engine": {
        "any": ["T1593.002"],
    },
    "whois": {
        "any": ["T1596.002"],
    },
    "passive dns": {
        "any": ["T1596.001"],
    },
    "shodan": {
        "any": ["T1596.005"],
    },
    "gather email": {
        "any": ["T1589.002"],
    },
    "employee enumeration": {
        "any": ["T1589.003", "T1591"],
    },
    "victim network info": {
        "any": ["T1590"],
    },
    "phishing for info": {
        "any": ["T1598"],
    },
    "vishing": {
        "any": ["T1566.004", "T1598.001"],
    },

    # -------------------------
    # Resource Development additions
    # -------------------------
    "acquire domain": {
        "any": ["T1583.001"],
    },
    "typosquatting": {
        "any": ["T1583.001"],
    },
    "vps": {
        "any": ["T1583.003"],
    },
    "bulletproof hosting": {
        "any": ["T1583.004"],
    },
    "develop malware": {
        "any": ["T1587.001"],
    },
    "custom malware": {
        "any": ["T1587.001"],
    },
    "exploit development": {
        "any": ["T1587.004"],
    },
    "obtain tool": {
        "any": ["T1588.002"],
    },
    "cobalt strike": {
        "any": ["T1588.002", "T1071.001", "T1105"],
    },
    "metasploit": {
        "any": ["T1588.002"],
    },
    "seo poisoning": {
        "any": ["T1608.006"],
    },
    "malware staging": {
        "any": ["T1608.001"],
    },
}


# ============================================================
# 4. MITRE TAXII CACHE (METADATA ONLY)
#    Enrich static IDs with live name/URL when available.
# ============================================================

class _MitreCache:
    _initialized = False
    _techniques: Dict[str, Dict] = {}

    @classmethod
    def initialize(cls) -> None:
        if cls._initialized or not MITRE_AVAILABLE:
            return

        try:
            connector = MITRETAXIIConnector(
                discovery_url=TAXII_DISCOVERY_URL,
                api_root=TAXII_API_ROOT,
                cache_dir=CACHE_DIR,
            )

            ent = COLLECTIONS.get("enterprise", {})
            cid = ent.get("id")
            if not cid:
                return

            data = connector.fetch_collection(cid)
            techniques = connector.get_techniques(data)

            for t in techniques or []:
                tid = t.get("id")
                if tid:
                    cls._techniques[tid] = t

            logger.info(
                f"[MITRE] Loaded {len(cls._techniques)} techniques (enrichment only)"
            )

        except Exception as e:
            logger.warning(f"[MITRE] TAXII enrichment failed: {e}")

        cls._initialized = True

    @classmethod
    def get(cls, tid: str) -> Dict:
        return cls._techniques.get(tid, {})


# ============================================================
# 5. FINAL SOC-SAFE MAPPING FUNCTION
#    - Static logic decides techniques
#    - Context-aware Initial Access
#    - TAXII enriches name & URL only
#    - Deterministic & audit-safe
# ============================================================

def map_to_tactics(
    weaknesses: List[str],
    text_hint: str = "",
    max_techniques: int = 5,
) -> List[Dict]:
    """
    SOC-GRADE MITRE MAPPING

    - Static logic decides techniques
    - Context-aware Initial Access routing
    - TAXII enriches name & URL only
    - Deterministic & audit-safe (no ML / LLM)
    """

    # Initialize enrichment cache (no impact on logic)
    _MitreCache.initialize()

    # Build analysis blob and infer attack vector
    blob = " ".join(weaknesses + [text_hint]).lower()
    vector = _infer_attack_vector(blob)

    selected: Dict[str, str] = {}
    confidence: Dict[str, int] = {}

    # Apply keyword-based heuristic rules
    for keyword, rules in HEURISTIC_RULES.items():
        if keyword not in blob:
            continue

        tids = rules.get(vector) or rules.get("any") or []
        for tid in tids:
            # Enforce static allow-list
            if tid not in STATIC_TTP_DETAILS:
                continue

            # Classification: primary for directly matched rules
            selected.setdefault(tid, "primary")
            confidence[tid] = confidence.get(tid, 0) + 1

    # Rank techniques by confidence (deterministic sort)
    ranked = sorted(
        confidence.keys(),
        key=lambda t: (confidence[t], t),  # secondary sort by ID for stability
        reverse=True,
    )[:max_techniques]

    results: List[Dict] = []
    for tid in ranked:
        tactic, default_name = STATIC_TTP_DETAILS[tid]
        default_url = f"https://attack.mitre.org/techniques/{tid}/"

        # TAXII enrichment (metadata only)
        live = _MitreCache.get(tid)
        name = live.get("name", default_name) if live else default_name
        url = live.get("url", default_url) if live else default_url

        results.append(
            {
                "techniqueId": tid,
                "tactic": tactic,
                "technique": name,
                "confidence": confidence.get(tid, 1),
                "classification": selected.get(tid, "conditional"),
                "url": url,
            }
        )

    return results