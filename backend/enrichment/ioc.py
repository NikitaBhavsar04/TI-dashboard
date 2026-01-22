#!/usr/bin/env python3
"""
SOC-Grade IOC Extraction Engine
Author: Prince Prajapati (SOC AI Model)

Rules:
- Extract IOCs from main article text only
- If none found, fetch ONLY IOC-relevant nested links
- Never treat CVE, filenames, or reference URLs as IOCs
"""

import re
import ipaddress
import requests
from typing import Dict, Set, List, Optional
from urllib.parse import urlparse

# ============================================================
# CONFIG
# ============================================================

MAX_TEXT_LEN = 5000
MAX_NESTED_LINKS = 5
REQUEST_TIMEOUT = 10

HEADERS = {
    "User-Agent": "SOC-IOC-Extractor/1.0"
}

IOC_LINK_KEYWORDS = {
    "ioc", "indicator", "indicators", "hash", "hashes",
    "sample", "samples", "payload", "payloads",
    "malware", "c2", "beacon", "dropper", "exploit"
}

BLOCKED_DOMAINS = {
    "microsoft.com", "google.com", "github.com",
    "linkedin.com", "twitter.com", "x.com",
    "facebook.com", "wikipedia.org"
}

BLOCKED_EXTENSIONS = {
    ".exe", ".dll", ".sys", ".bat", ".cmd",
    ".ps1", ".vbs", ".js", ".jar", ".apk"
}

# ============================================================
# REGEX (STRICT)
# ============================================================

RE_IPV4 = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}'
    r'(?:25[0-5]|2[0-4]\d|1?\d?\d)(?::\d{1,5})?\b'
)

RE_DOMAIN  = re.compile(r'\b(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}\b', re.I)
RE_URL     = re.compile(r'https?://[^\s<>"\']+')

RE_MD5     = re.compile(r'\b[a-f0-9]{32}\b', re.I)
RE_SHA1    = re.compile(r'\b[a-f0-9]{40}\b', re.I)
RE_SHA256  = re.compile(r'\b[a-f0-9]{64}\b', re.I)

RE_EMAIL   = re.compile(r'\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b', re.I)
RE_BTC     = re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b')

# ============================================================
# DEOBFUSCATION
# ============================================================

def deobfuscate(text: str) -> str:
    if not text:
        return ""
    return (
        text.replace("[.]", ".")
            .replace("(.)", ".")
            .replace("[:]", ":")
            .replace("hxxp://", "http://")
            .replace("hxxps://", "https://")
    )

# ============================================================
# VALIDATION
# ============================================================

def is_public_ip(ip: str) -> bool:
    try:
        ip = ip.split(":")[0]
        addr = ipaddress.ip_address(ip)
        return not (
            addr.is_private or
            addr.is_loopback or
            addr.is_multicast or
            addr.is_reserved
        )
    except ValueError:
        return False

def is_valid_domain(domain: str) -> bool:
    domain = domain.lower()

    if domain in BLOCKED_DOMAINS:
        return False

    if any(domain.endswith(ext) for ext in BLOCKED_EXTENSIONS):
        return False

    return True

def is_malicious_url(url: str) -> bool:
    parsed = urlparse(url)

    # Reject reference-style pages
    if parsed.path.count("/") < 2:
        return False

    # Payload / malware delivery
    if any(ext in parsed.path.lower() for ext in BLOCKED_EXTENSIONS):
        return True

    if RE_SHA256.search(url):
        return True

    return False

# ============================================================
# CORE IOC EXTRACTION
# ============================================================

def extract_iocs_from_text(text: str) -> Dict[str, Set[str]]:
    text = deobfuscate(text)

    iocs: Dict[str, Set[str]] = {
        "ipv4": set(),
        "domain": set(),
        "url": set(),
        "md5": set(),
        "sha1": set(),
        "sha256": set(),
        "email": set(),
        "bitcoin": set(),
    }

    # IPs
    for ip in RE_IPV4.findall(text):
        if is_public_ip(ip):
            iocs["ipv4"].add(ip.split(":")[0])

    # URLs
    for url in RE_URL.findall(text):
        if is_malicious_url(url):
            iocs["url"].add(url)

    # Domains
    for domain in RE_DOMAIN.findall(text):
        if is_valid_domain(domain):
            iocs["domain"].add(domain.lower())

    # Hashes (priority)
    iocs["md5"].update(RE_MD5.findall(text))
    iocs["sha1"].update(RE_SHA1.findall(text))
    iocs["sha256"].update(RE_SHA256.findall(text))

    # Email & BTC
    iocs["email"].update(RE_EMAIL.findall(text))
    iocs["bitcoin"].update(RE_BTC.findall(text))

    return iocs

# ============================================================
# IOC-AWARE NESTED LINK FILTERING
# ============================================================

def is_ioc_relevant_link(url: str, anchor: str = "") -> bool:
    combined = f"{url} {anchor}".lower()

    if any(k in combined for k in IOC_LINK_KEYWORDS):
        return True

    parsed = urlparse(url)
    suspicious_paths = [
        "/ioc", "/indicator", "/hash",
        "/sample", "/payload", "/malware",
        "/download"
    ]

    return any(p in parsed.path.lower() for p in suspicious_paths)

def fetch_page_text(url: str) -> str:
    try:
        r = requests.get(
            url,
            headers=HEADERS,
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True
        )
        if r.ok and "text" in r.headers.get("Content-Type", ""):
            return r.text[:MAX_TEXT_LEN]
    except Exception:
        pass
    return ""

# ============================================================
# PUBLIC API
# ============================================================

def extract_iocs(
    article_text: str,
    nested_links: Optional[List[Dict[str, str]]] = None
) -> Dict[str, List[str]]:
    """
    SOC Rule:
    1. Extract IOCs from main article
    2. If none found → fetch ONLY IOC-relevant nested links
    """

    # 1️⃣ Main article
    primary_iocs = extract_iocs_from_text(article_text)
    if any(primary_iocs.values()):
        return {k: sorted(v) for k, v in primary_iocs.items() if v}

    # 2️⃣ No IOC → smart nested fetch
    if not nested_links:
        return {}

    for link in nested_links[:MAX_NESTED_LINKS]:
        url = link.get("url")
        anchor = link.get("text", "")

        if not url:
            continue

        if not is_ioc_relevant_link(url, anchor):
            continue

        page_text = fetch_page_text(url)
        if not page_text:
            continue

        nested_iocs = extract_iocs_from_text(page_text)
        if any(nested_iocs.values()):
            return {k: sorted(v) for k, v in nested_iocs.items() if v}

    return {}

# ============================================================
# EXAMPLE
# ============================================================

if __name__ == "__main__":
    text = """
    The malware drops payload from hxxps://evil-site[.]xyz/payload.exe
    SHA256: 9f2c3a8e6b0d4e4e1b0f6f7e9d3c8a1f2e4b5c6d7e8f9a0b1c2d3e4f5a6b7
    """

    nested = [
        {"url": "https://blog.example.com/analysis", "text": "Read more"},
        {"url": "https://paste.example.com/ioc-list", "text": "Indicators of Compromise"},
    ]

    print(extract_iocs(text, nested))