from typing import List, Dict, Tuple, Optional
from pathlib import Path
from utils.common import logger

# Try importing the connector, handle failure gracefully
try:
    from collectors.taxii_connector import MITRETAXIIConnector
    from collectors.mitre_config import (
        TAXII_DISCOVERY_URL, 
        TAXII_API_ROOT, 
        CACHE_DIR, 
        COLLECTIONS
    )
    MITRE_AVAILABLE = True
except ImportError:
    logger.warning("MITRE TAXII modules not found. Using static fallback only.")
    MITRE_AVAILABLE = False
    CACHE_DIR = Path("./data/cache")


# --------------------------------------------------------------------------
# 1. STATIC BACKUP DATA (Restored from your original file)
# Used if the MITRE server is unreachable
# --------------------------------------------------------------------------
STATIC_TTP_DETAILS = {
    # Initial Access
    "T1190": ("Initial Access", "Exploit Public-Facing Application"),
    "T1195": ("Initial Access", "Supply Chain Compromise"),
    "T1566": ("Initial Access", "Phishing"),
    "T1566.001": ("Initial Access", "Spearphishing Attachment"),
    "T1566.002": ("Initial Access", "Spearphishing Link"),
    "T1189": ("Initial Access", "Drive-by Compromise"),
    "T1092": ("Initial Access", "Replication Through Removable Media"),

    # Execution
    "T1059": ("Execution", "Command and Scripting Interpreter"),
    "T1059.001": ("Execution", "PowerShell"),
    "T1059.003": ("Execution", "Windows Command Shell"),
    "T1059.004": ("Execution", "Unix Shell"),
    "T1059.005": ("Execution", "Visual Basic"),
    "T1059.006": ("Execution", "Python"),

    # Persistence
    "T1547": ("Persistence", "Boot or Logon Autostart Execution"),
    "T1547.001": ("Persistence", "Registry Run Keys / Startup Folder"),
    "T1053": ("Persistence", "Scheduled Task/Job"),
    "T1053.003": ("Persistence", "Cron"),
    "T1543": ("Persistence", "Create or Modify System Process"),

    # Privilege Escalation
    "T1068": ("Privilege Escalation", "Exploitation for Privilege Escalation"),
    "T1548.002": ("Privilege Escalation", "Bypass User Account Control"),
    "T1548.003": ("Privilege Escalation", "Sudo and Sudo Caching"),

    # Defense Evasion
    "T1027": ("Defense Evasion", "Obfuscated/Compressed Files"),
    "T1562": ("Defense Evasion", "Impair Defenses"),
    "T1562.001": ("Defense Evasion", "Disable or Modify Tools"),
    "T1562.004": ("Defense Evasion", "Disable Firewall"),
    "T1070": ("Defense Evasion", "Indicator Removal on Host"),
    "T1070.001": ("Defense Evasion", "Clear Windows Event Logs"),
    "T1070.002": ("Defense Evasion", "Clear Linux Logs"),

    # Credential Access
    "T1555": ("Credential Access", "Credentials from Password Stores"),
    "T1555.003": ("Credential Access", "Credentials from Web Browsers"),
    "T1003": ("Credential Access", "OS Credential Dumping"),
    "T1003.001": ("Credential Access", "LSASS Memory"),
    "T1003.003": ("Credential Access", "NTDS"),
    "T1056": ("Credential Access", "Input Capture"),

    # Discovery
    "T1046": ("Discovery", "Network Service Discovery"),
    "T1087": ("Discovery", "Account Discovery"),
    "T1057": ("Discovery", "Process Discovery"),
    "T1082": ("Discovery", "System Information Discovery"),
    "T1018": ("Discovery", "Remote System Discovery"),

    # Lateral Movement
    "T1021": ("Lateral Movement", "Remote Services"),
    "T1021.001": ("Lateral Movement", "Remote Desktop Protocol"),
    "T1021.002": ("Lateral Movement", "SMB/Windows Admin Shares"),
    "T1021.004": ("Lateral Movement", "SSH"),
    "T1550.002": ("Lateral Movement", "Pass the Hash"),
    "T1550.003": ("Lateral Movement", "Pass the Ticket"),

    # Command and Control
    "T1071": ("Command and Control", "Application Layer Protocol"),
    "T1071.001": ("Command and Control", "Web Protocols"),
    "T1071.004": ("Command and Control", "DNS"),

    # Exfiltration
    "T1041": ("Exfiltration", "Exfiltration Over C2 Channel"),
    "T1567": ("Exfiltration", "Exfiltration Over Web Services"),
    "T1048.003": ("Exfiltration", "Exfiltration Over FTP"),

    # Impact
    "T1486": ("Impact", "Data Encrypted for Impact"),
    "T1485": ("Impact", "Data Destruction"),
    "T1499": ("Impact", "Endpoint Denial of Service"),
    "T1499.004": ("Impact", "Resource Exhaustion"),
}

# --------------------------------------------------------------------------
# 2. DETECTION LOGIC (Expanded for better coverage)
# --------------------------------------------------------------------------
CWE_TO_TTP = {
    # Expanded Initial Access
    "public-facing application": ["T1190"],
    "web application": ["T1190"],
    "api": ["T1190"],  # Added
    "exploit": ["T1190"], # Added generic
    "supply chain": ["T1195"],
    "phishing": ["T1566"],
    "spearphishing": ["T1566.001"],
    "attachment": ["T1566.001"],
    "malicious link": ["T1566.002"],
    "drive by": ["T1189"],
    
    # Expanded Execution
    "code execution": ["T1059"],
    "rce": ["T1059"],
    "command execution": ["T1059"],
    "arbitrary code": ["T1059"], # Added
    "powershell": ["T1059.001"],
    "python": ["T1059.006"],
    "bash": ["T1059.004"],
    "script": ["T1059"], # Added
    
    # Persistence
    "persistence": ["T1547"],
    "scheduled task": ["T1053"],
    "cron": ["T1053.003"],
    
    # Privilege Escalation
    "privilege escalation": ["T1068"],
    "root": ["T1068"], # Added
    "admin": ["T1068"], # Added
    "sudo": ["T1548.003"],
    "uac": ["T1548.002"],
    "bypass": ["T1548.002"], # Added generic bypass often maps here
    
    # Defense Evasion
    "obfuscation": ["T1027"],
    "disable security": ["T1562"],
    "log deletion": ["T1070"],
    "inject": ["T1055"], # Added Process Injection
    
    # Credential Access
    "credential": ["T1555"],
    "password": ["T1555"],
    "dumping": ["T1003"],
    "lsass": ["T1003.001"],
    
    # Discovery
    "discovery": ["T1082"],
    "reconnaissance": ["T1046"],
    "scan": ["T1046"],
    
    # Lateral Movement
    "lateral movement": ["T1021"],
    "rdp": ["T1021.001"],
    "smb": ["T1021.002"],
    "ssh": ["T1021.004"],
    
    # Impact
    "ransomware": ["T1486"],
    "encrypt": ["T1486"],
    "denial of service": ["T1499"],
    "dos": ["T1499"],
    "crash": ["T1499"], # Added
}

# --------------------------------------------------------------------------
# 3. HYBRID KNOWLEDGE BASE (Dynamic + Static)
# --------------------------------------------------------------------------
class MitreKnowledgeBase:
    _instance = None
    _technique_cache = {}
    _initialized = False
    _technique_list = []

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def initialize(self):
        """Try to fetch data from MITRE TAXII. If fails, we just don't populate the cache."""
        if self._initialized or not MITRE_AVAILABLE:
            return

        logger.info("Initializing MITRE Knowledge Base from TAXII...")
        try:
            connector = MITRETAXIIConnector(
                discovery_url=TAXII_DISCOVERY_URL,
                api_root=TAXII_API_ROOT,
                cache_dir=CACHE_DIR
            )
            # Enterprise ATT&CK Collection
            ent_config = COLLECTIONS.get("enterprise", {})
            collection_id = ent_config.get("id")

            if collection_id:
                data = connector.fetch_collection(collection_id=collection_id)
                techniques = connector.get_techniques(data)

                # Keep both a list and an id->object cache for flexible access
                self._technique_list = techniques or []
                for t in self._technique_list:
                    t_id = t.get("id")
                    if t_id:
                        self._technique_cache[t_id] = t

                logger.info(f"✓ MITRE Live Data Loaded: {len(self._technique_cache)} techniques.")
            else:
                logger.warning("Enterprise Collection ID missing.")

        except Exception as e:
            logger.error(f"⚠ MITRE Live Fetch Failed: {e}. Using static fallback.")
        
        self._initialized = True

    def get_details(self, technique_id: str) -> Tuple[str, str, str]:
        """
        Lookup Priority:
        1. Live TAXII Cache
        2. Static Fallback Dictionary
        3. Generic "Unknown"
        """
        # 1. Try Live Cache
        if self._technique_cache and technique_id in self._technique_cache:
            data = self._technique_cache[technique_id]
            name = data.get("name", "Unknown Technique")
            url = data.get("url", "")
            tactics = " / ".join(data.get("tactics", ["Unknown"]))
            return tactics, name, url
            
        # 2. Try Static Fallback
        if technique_id in STATIC_TTP_DETAILS:
            tactic, name = STATIC_TTP_DETAILS[technique_id]
            url = f"https://attack.mitre.org/techniques/{technique_id}/"
            return tactic, name, url
            
        # 3. Give up
        return "Unknown Tactic", "Unknown Technique", ""

    def get_all_techniques(self) -> List[Dict]:
        """Return all known techniques as a list (live data preferred)."""
        if self._technique_list:
            return list(self._technique_list)
        return list(self._technique_cache.values())

    def get_sub_techniques(self, parent_id: str) -> List[Dict]:
        """Return sub-techniques for a given parent technique id (e.g. T1566 -> T1566.001)."""
        prefix = parent_id + "."
        subs = [t for t in self.get_all_techniques() if t.get("id", "").startswith(prefix)]
        return sorted(subs, key=lambda x: x.get("id", ""))


# --------------------------------------------------------------------------
# 4. MAPPING FUNCTION (With Limits)
# --------------------------------------------------------------------------
def map_to_tactics(weaknesses: List[str], text_hint: str = "") -> List[Dict]:
    """
    Maps text/keywords to TTPs using hybrid lookup.
    Enforces a max limit of 5 techniques.
    """
    # Ensure KB is ready (lazy loading)
    MitreKnowledgeBase.get_instance().initialize()
    kb = MitreKnowledgeBase.get_instance()
    
    found_ids = set()
    blob = " ".join(weaknesses + [text_hint]).lower()
    
    # Keyword Matching
    for keyword, ttp_ids in CWE_TO_TTP.items():
        if keyword in blob:
            found_ids.update(ttp_ids)
            
    # Heuristics for complex concepts
    if "rce" in blob or "remote code" in blob:
        found_ids.add("T1190") 
        found_ids.add("T1059")
    if "privilege" in blob:
        found_ids.add("T1068")
    
    # Sort and Limit to top 5
    sorted_ids = sorted(list(found_ids))
    
    # Only take the first 5 to prevent UI clutter
    # (Note: "At least 4" depends on the input having enough keywords)
    final_ids = sorted_ids[:5]
    
    out = []
    for tid in final_ids:
        tactic_str, tech_name, tech_url = kb.get_details(tid)
        out.append({
            "techniqueId": tid,
            "tactic": tactic_str,
            "technique": tech_name,
            "url": tech_url
        })
        
    return out


def find_relevant_techniques(advisory_text: str, top_n: int = 5) -> List[Dict]:
    """Return top matching techniques for an advisory text using simple keyword scoring.

    Each returned item is a dict: {'score': int, 'data': technique_dict}
    """
    MitreKnowledgeBase.get_instance().initialize()
    all_techniques = MitreKnowledgeBase.get_instance().get_all_techniques()

    keywords = advisory_text.lower().split()
    scored = []

    for tech in all_techniques:
        score = 0
        tech_content = (tech.get('name', '') + ' ' + tech.get('description', '')).lower()
        for word in keywords:
            if len(word) > 3 and word in tech_content:
                score += 1
        if score > 0:
            scored.append({'score': score, 'data': tech})

    scored.sort(key=lambda x: x['score'], reverse=True)
    return scored[:top_n]


def get_sub_techniques_for_parent(parent_id: str) -> List[Dict]:
    """Convenience wrapper to return sub-techniques for a parent technique id."""
    MitreKnowledgeBase.get_instance().initialize()
    return MitreKnowledgeBase.get_instance().get_sub_techniques(parent_id)