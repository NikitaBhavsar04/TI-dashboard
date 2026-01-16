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
    "T1190": ("Initial Access", "Exploit Public-Facing Application"),
    "T1189": ("Initial Access", "Drive-by Compromise"),
    "T1133": ("Initial Access", "External Remote Services"),
    "T1078": ("Initial Access", "Valid Accounts"),
    "T1078.001": ("Initial Access", "Local Accounts"),
    "T1078.002": ("Initial Access", "Domain Accounts"),
    "T1078.003": ("Initial Access", "Cloud Accounts"),
    "T1566": ("Initial Access", "Phishing"),
    "T1566.001": ("Initial Access", "Spearphishing Attachment"),
    "T1566.002": ("Initial Access", "Spearphishing Link"),
    "T1566.003": ("Initial Access", "Spearphishing via Service"),
    "T1195": ("Initial Access", "Supply Chain Compromise"),
    "T1195.002": ("Initial Access", "Compromise Software Supply Chain"),
    "T1195.003": ("Initial Access", "Compromise Hardware Supply Chain"),

    # -------------------------
    # EXECUTION (TA0002)
    # -------------------------
    "T1204": ("Execution", "User Execution"),
    "T1204.002": ("Execution", "Malicious File"),
    "T1059": ("Execution", "Command and Scripting Interpreter"),
    "T1059.001": ("Execution", "PowerShell"),
    "T1059.003": ("Execution", "Windows Command Shell"),
    "T1059.004": ("Execution", "Unix Shell"),
    "T1059.006": ("Execution", "Python"),
    "T1053": ("Execution", "Scheduled Task/Job"),
    "T1053.005": ("Execution", "Scheduled Task"),
    "T1053.003": ("Execution", "Cron"),
    "T1047": ("Execution", "Windows Management Instrumentation"),
    "T1055": ("Execution", "Process Injection"),

    # -------------------------
    # PERSISTENCE (TA0003)
    # -------------------------
    "T1547": ("Persistence", "Boot or Logon Autostart Execution"),
    "T1547.001": ("Persistence", "Registry Run Keys / Startup Folder"),
    "T1547.004": ("Persistence", "Winlogon Helper DLL"),
    "T1547.009": ("Persistence", "Shortcut Modification"),
    "T1053": ("Persistence", "Scheduled Task/Job"),
    "T1053.005": ("Persistence", "Scheduled Task"),
    "T1053.003": ("Persistence", "Cron"),
    "T1136": ("Persistence", "Create Account"),
    "T1136.001": ("Persistence", "Local Account"),
    "T1136.002": ("Persistence", "Domain Account"),

    # -------------------------
    # PRIVILEGE ESCALATION (TA0004)
    # -------------------------
    "T1068": ("Privilege Escalation", "Exploitation for Privilege Escalation"),
    "T1548": ("Privilege Escalation", "Abuse Elevation Control Mechanism"),
    "T1548.002": ("Privilege Escalation", "Bypass User Account Control"),
    "T1055": ("Privilege Escalation", "Process Injection"),
    "T1078": ("Privilege Escalation", "Valid Accounts"),

    # -------------------------
    # DEFENSE EVASION (TA0005)
    # -------------------------
    "T1027": ("Defense Evasion", "Obfuscated/Encrypted Files or Information"),
    "T1036": ("Defense Evasion", "Masquerading"),
    "T1036.005": ("Defense Evasion", "Match Legitimate Name or Location"),
    "T1070": ("Defense Evasion", "Indicator Removal on Host"),
    "T1070.001": ("Defense Evasion", "Clear Windows Event Logs"),
    "T1070.004": ("Defense Evasion", "File Deletion"),
    "T1562": ("Defense Evasion", "Impair Defenses"),
    "T1562.001": ("Defense Evasion", "Disable or Modify Tools"),
    "T1562.004": ("Defense Evasion", "Disable or Modify System Firewall"),

    # -------------------------
    # CREDENTIAL ACCESS (TA0006)
    # -------------------------
    "T1003": ("Credential Access", "OS Credential Dumping"),
    "T1003.001": ("Credential Access", "LSASS Memory"),
    "T1003.002": ("Credential Access", "Security Account Manager"),
    "T1003.003": ("Credential Access", "NTDS"),
    "T1555": ("Credential Access", "Credentials from Password Stores"),
    "T1555.003": ("Credential Access", "Credentials from Web Browsers"),
    "T1110": ("Credential Access", "Brute Force"),
    "T1110.001": ("Credential Access", "Password Guessing"),
    "T1110.003": ("Credential Access", "Password Spraying"),

    # -------------------------
    # DISCOVERY (TA0007)
    # -------------------------
    "T1082": ("Discovery", "System Information Discovery"),
    "T1046": ("Discovery", "Network Service Discovery"),
    "T1018": ("Discovery", "Remote System Discovery"),
    "T1049": ("Discovery", "System Network Connections Discovery"),

    # -------------------------
    # LATERAL MOVEMENT (TA0008)
    # -------------------------
    "T1021": ("Lateral Movement", "Remote Services"),
    "T1021.001": ("Lateral Movement", "Remote Desktop Protocol"),
    "T1021.002": ("Lateral Movement", "SMB/Windows Admin Shares"),
    "T1021.004": ("Lateral Movement", "SSH"),
    "T1021.006": ("Lateral Movement", "Windows Remote Management"),
    "T1078": ("Lateral Movement", "Valid Accounts"),

    # -------------------------
    # COMMAND AND CONTROL (TA0011)
    # -------------------------
    "T1071": ("Command and Control", "Application Layer Protocol"),
    "T1071.001": ("Command and Control", "Web Protocols"),
    "T1071.002": ("Command and Control", "File Transfer Protocols"),
    "T1095": ("Command and Control", "Non-Application Layer Protocol"),
    "T1105": ("Command and Control", "Ingress Tool Transfer"),

    # -------------------------
    # IMPACT (TA0040)
    # -------------------------
    "T1486": ("Impact", "Data Encrypted for Impact"),
    "T1499": ("Impact", "Endpoint Denial of Service"),
    "T1490": ("Impact", "Inhibit System Recovery"),
    "T1489": ("Impact", "Service Stop"),
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
        "any": ["T1499"],
    },
    "dos": {
        "any": ["T1499"],
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