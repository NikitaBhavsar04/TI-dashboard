import re
import ipaddress
import requests
from typing import Dict, List, Set, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

# ============================================================
# CONFIGURATION
# ============================================================

@dataclass
class Config:
    """Configuration for IOC extraction"""
    MAX_WORKERS: int = 6
    REQUEST_TIMEOUT: int = 10
    MAX_NESTED_LINKS: int = 6
    MAX_TEXT_LENGTH: int = 5000
    HEADERS: Dict[str, str] = None
    
    def __post_init__(self):
        if self.HEADERS is None:
            self.HEADERS = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }

# Expanded list based on 2025/2026 threat intelligence reports
NOISE_DOMAINS = [
    "facebook.com", "lnkd.in", "linkedin.com", "twitter.com", "x.com",
    "google.com", "youtube.com", "github.com", "cloudflare.com",
    "thehackernews.com", "reddit.com", "wikipedia.org", "instagram.com",
    "medium.com", "microsoft.com", "apple.com", "amazon.com", "office.com"
]

# Updated based on 2025 malware TLD abuse patterns
SUSPICIOUS_TLDS = [
    "ru", "cn", "tk", "pw", "cc", "top", "xyz", "work", "monster", 
    "info", "buzz", "click", "link", "ga", "ml", "cf", "gq", "ws",
    "zip", "mov", "app", "download", "online", "space", "live"
]  # [web:16][web:19]

# ============================================================
# COMPILED REGEX PATTERNS
# ============================================================

class RegexPatterns:
    """Pre-compiled regex patterns for performance"""
    
    # IPv4 with optional port
    IPV4 = re.compile(
        r'\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}'
        r'(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?::\d{1,5})?\b'
    )
    
    # Domain with broader TLD support
    DOMAIN = re.compile(
        r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
    )
    
    # URLs
    URL = re.compile(r'https?://[^\s<>"\'(){}\[\]]+')
    
    # Hashes
    MD5 = re.compile(r'\b[a-fA-F0-9]{32}\b')
    SHA1 = re.compile(r'\b[a-fA-F0-9]{40}\b')
    SHA256 = re.compile(r'\b[a-fA-F0-9]{64}\b')
    
    # CVE identifiers (critical for threat intel)
    CVE = re.compile(r'(?i)\bCVE-\d{4}-\d{4,7}\b')  # [web:17]
    
    # Email addresses
    EMAIL = re.compile(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b')
    
    # Bitcoin addresses
    BITCOIN = re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b')

# ============================================================
# DEOBFUSCATION
# ============================================================

def deobfuscate(text: str) -> str:
    """
    Remove common IOC obfuscation patterns found in threat reports
    [web:12][web:15]
    """
    if not text:
        return ""
    
    replacements = {
        "[.]": ".",
        "(.)": ".",
        "{.}": ".",
        "[ . ]": ".",
        " dot ": ".",
        "[dot]": ".",
        "(dot)": ".",
        "hxxp://": "http://",
        "hxxps://": "https://",
        "h**p://": "http://",
        "h**ps://": "https://",
        "[://]": "://",
        "[http]": "http",
        "[https]": "https",
        "&amp;": "&",
        "[@]": "@",
        "[ @ ]": "@"
    }
    
    result = text
    for pattern, replacement in replacements.items():
        result = result.replace(pattern, replacement)
    
    return result

# ============================================================
# VALIDATION FUNCTIONS
# ============================================================

def is_public_ip(ip: str) -> bool:
    """Check if IP is public (not private, loopback, reserved)"""
    # Remove port if present
    ip = ip.split(':')[0]
    
    try:
        addr = ipaddress.ip_address(ip)
        return not (
            addr.is_private or
            addr.is_loopback or
            addr.is_reserved or
            addr.is_multicast or
            addr.is_unspecified or
            addr.is_link_local
        )
    except (ValueError, AttributeError):
        return False

def is_suspicious_domain(domain: str) -> bool:
    """
    Heuristic detection for suspicious domains
    Based on threat intelligence patterns [web:16][web:19]
    """
    domain_lower = domain.lower()
    
    # Skip noise domains
    if any(noise in domain_lower for noise in NOISE_DOMAINS):
        return False
    
    # Check TLD
    tld = domain.split('.')[-1].lower()
    if tld in SUSPICIOUS_TLDS:
        return True
    
    # Random-looking strings (10+ alphanumeric chars without separators)
    if re.search(r'[a-z0-9]{10,}', domain_lower.replace('.', '').replace('-', '')):
        return True
    
    # IP-like patterns in domain
    if re.search(r'\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}', domain):
        return True
    
    # Excessive hyphens or numbers
    if domain.count('-') > 3 or len(re.findall(r'\d', domain)) > 8:
        return True
    
    # Very long subdomain
    parts = domain.split('.')
    if any(len(part) > 20 for part in parts):
        return True
    
    return False

def is_suspicious_url(url: str) -> bool:
    """Check if URL is suspicious"""
    url_lower = url.lower()
    
    # Skip noise domains
    if any(noise in url_lower for noise in NOISE_DOMAINS):
        return False
    
    # Contains IP address
    if re.search(r'\d+\.\d+\.\d+\.\d+', url):
        return True
    
    # Contains long hex strings (possible C2)
    if re.search(r'[a-fA-F0-9]{32,}', url):
        return True
    
    # Suspicious file extensions
    suspicious_ext = ['.exe', '.dll', '.scr', '.bat', '.ps1', '.vbs', '.js', '.jar', '.apk']
    if any(ext in url_lower for ext in suspicious_ext):
        return True
    
    return False

# ============================================================
# CORE EXTRACTION
# ============================================================

def extract_from_text(text: str) -> Dict[str, Set[str]]:
    """Extract IOCs from text with validation"""
    text = deobfuscate(text)
    
    iocs = {
        "ipv4": set(),
        "domains": set(),
        "urls": set(),
        "md5": set(),
        "sha1": set(),
        "sha256": set(),
        "cve": set(),
        "email": set(),
        "bitcoin": set()
    }
    
    # Extract IPs
    for ip in RegexPatterns.IPV4.findall(text):
        if is_public_ip(ip):
            iocs["ipv4"].add(ip)
    
    # Extract URLs first (to get domains and IPs from them)
    raw_urls = RegexPatterns.URL.findall(text)
    for url in raw_urls:
        url_clean = url.rstrip('.,;:)')  # Clean trailing punctuation
        
        # Extract IP from URL
        ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', url_clean)
        if ip_match and is_public_ip(ip_match.group(1)):
            iocs["ipv4"].add(ip_match.group(1))
        
        # Keep suspicious URLs
        if is_suspicious_url(url_clean):
            iocs["urls"].add(url_clean)
    
    # Extract domains
    for domain in RegexPatterns.DOMAIN.findall(text):
        domain = domain.lower().strip('.')
        if is_suspicious_domain(domain):
            iocs["domains"].add(domain)
    
    # Extract hashes
    iocs["md5"].update(RegexPatterns.MD5.findall(text))
    iocs["sha1"].update(RegexPatterns.SHA1.findall(text))
    iocs["sha256"].update(RegexPatterns.SHA256.findall(text))
    
    # Extract CVEs (case-insensitive, then uppercase)
    iocs["cve"].update(cve.upper() for cve in RegexPatterns.CVE.findall(text))
    
    # Extract emails (from suspicious domains only)
    for email in RegexPatterns.EMAIL.findall(text):
        email_domain = email.split('@')[1].lower()
        if is_suspicious_domain(email_domain):
            iocs["email"].add(email.lower())
    
    # Extract Bitcoin addresses
    iocs["bitcoin"].update(RegexPatterns.BITCOIN.findall(text))
    
    return iocs

# ============================================================
# NESTED LINK FETCHING
# ============================================================

def fetch_url(url: str, config: Config) -> Optional[str]:
    """Fetch content from URL with timeout"""
    try:
        response = requests.get(
            url,
            headers=config.HEADERS,
            timeout=config.REQUEST_TIMEOUT,
            allow_redirects=True
        )
        if response.ok:
            return response.text[:config.MAX_TEXT_LENGTH]
    except Exception:
        pass
    return None

def extract_from_nested_links(
    links: List[str],
    config: Config
) -> Dict[str, Set[str]]:
    """
    Fetch and extract IOCs from nested links concurrently
    Returns as soon as IOCs are found (early exit optimization)
    """
    iocs = {
        "ipv4": set(),
        "domains": set(),
        "urls": set(),
        "md5": set(),
        "sha1": set(),
        "sha256": set(),
        "cve": set(),
        "email": set(),
        "bitcoin": set()
    }
    
    with ThreadPoolExecutor(max_workers=config.MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetch_url, url, config): url 
            for url in links[:config.MAX_NESTED_LINKS]
        }
        
        for future in as_completed(futures):
            text = future.result()
            if not text:
                continue
            
            nested_iocs = extract_from_text(text)
            
            # Merge results
            found_any = False
            for key, values in nested_iocs.items():
                if values:
                    iocs[key].update(values)
                    found_any = True
            
            # Early exit if we found IOCs
            if found_any:
                break
    
    return iocs

# ============================================================
# PUBLIC API
# ============================================================

def extract_iocs(
    article_text: str,
    nested_links: Optional[List[str]] = None,
    config: Optional[Config] = None
) -> Dict[str, List[str]]:
    """
    Extract Indicators of Compromise from threat intelligence text
    
    Args:
        article_text: Main article/report text to extract IOCs from
        nested_links: Optional list of URLs to fetch if main text has no IOCs
        config: Optional configuration object
    
    Returns:
        Dictionary with IOC types as keys and sorted lists of unique IOCs
    
    Example:
        >>> result = extract_iocs(threat_report_text)
        >>> print(result['ipv4'])
        ['192.0.2.1', '198.51.100.5']
    """
    if config is None:
        config = Config()
    
    # Extract from main article
    iocs = extract_from_text(article_text)
    
    # Check if we found anything meaningful
    has_iocs = any(len(v) > 0 for v in iocs.values())
    
    # Fallback to nested links if no IOCs found
    if not has_iocs and nested_links:
        nested_iocs = extract_from_nested_links(nested_links, config)
        for key, values in nested_iocs.items():
            iocs[key].update(values)
    
    # Convert sets to sorted lists and remove empty categories
    result = {}
    for key, values in iocs.items():
        if values:
            result[key] = sorted(values)
    
    return result

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def deduplicate_iocs(iocs: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """Remove duplicate IOCs across categories"""
    # Remove IPs that appear in URLs
    if "urls" in iocs and "ipv4" in iocs:
        url_ips = set()
        for url in iocs["urls"]:
            ip_match = re.search(r'\d+\.\d+\.\d+\.\d+', url)
            if ip_match:
                url_ips.add(ip_match.group(1))
        
        iocs["ipv4"] = [ip for ip in iocs["ipv4"] if ip not in url_ips]
    
    return {k: v for k, v in iocs.items() if v}

# ============================================================
# EXAMPLE USAGE
# ============================================================

if __name__ == "__main__":
    sample_text = """
    Threat actors using hxxps://malicious-site[.]top/payload.exe
    C2 server at 203[.]0[.]113[.]42 communicating via port 8080.
    Sample hash: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
    CVE-2024-1234 was exploited in this campaign.
    Bitcoin ransom: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
    Contact: attacker@suspicious-domain[.]xyz
    """
    
    result = extract_iocs(sample_text)
    
    print("=== Extracted IOCs ===")
    for ioc_type, values in result.items():
        print(f"\n{ioc_type.upper()}:")
        for value in values:
            print(f"  - {value}")