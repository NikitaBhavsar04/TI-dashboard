import re
from typing import List, Dict

def extract_iocs(text: str) -> Dict[str, List[str]]:
    """Extract IOCs (IPv4, IPv6, domains, URLs, hashes) from text."""
    iocs = {
        'ipv4': re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', text or ''),
        'ipv6': re.findall(r'\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b', text or '', re.I),
        'domains': re.findall(r'\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b', text or ''),
        'urls': re.findall(r'https?://[\w\.-/\?&=%#]+', text or ''),
        'md5': re.findall(r'\b[a-fA-F0-9]{32}\b', text or ''),
        'sha1': re.findall(r'\b[a-fA-F0-9]{40}\b', text or ''),
        'sha256': re.findall(r'\b[a-fA-F0-9]{64}\b', text or ''),
    }
    # Remove overlaps (e.g., domains inside URLs)
    iocs['domains'] = [d for d in iocs['domains'] if not any(d in u for u in iocs['urls'])]
    # If all are empty, add a default
    if not any(iocs.values()):
        iocs['note'] = ['No IOCs observed / not required for this advisory']
    return iocs
