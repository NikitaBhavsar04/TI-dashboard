import re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from readability.readability import Document

CVE_RE = re.compile(r"\bCVE-(?:19|20)\d{2}-\d{4,7}\b", re.I)

HIGH_SIGNAL_ANCHORS = {
    "exploit", "proof of concept", "poc", "vulnerability",
    "advisory", "technical details", "analysis", "report",
    "malware", "campaign", "attack"
}

LOW_SIGNAL_ANCHORS = {
    "read more", "click here", "learn more", "details"
}

BLOCKED_DOMAINS = {
    "youtube.com", "youtu.be", "reddit.com", "i.redd.it",
    "twitter.com", "x.com", "facebook.com", "linkedin.com",
    "instagram.com", "medium.com"
}

SECURITY_CONTEXT = {
    "vulnerability", "exploit", "cve", "rce", "remote code",
    "breach", "data leak", "malware", "ransomware",
    "threat actor", "apt", "campaign", "phishing",
    "zero-day", "patch", "security flaw"
}

def extract_title(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:title")
    if og and og.get("content"):
        return og["content"].strip()
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    return ""

def extract_article_text(html: str, min_len=800, max_len=20000) -> str:
    doc = Document(html)
    content = doc.summary(html_partial=True)
    soup = BeautifulSoup(content, "html.parser")
    for t in soup(["script", "style", "nav", "footer", "aside"]):
        t.decompose()
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
    return text[:max_len] if len(text) >= min_len else ""

def extract_cves(text: str) -> list:
    found = set()
    for m in CVE_RE.finditer(text):
        found.add(m.group(0).upper())
    return sorted(found)

def has_security_context(text: str) -> bool:
    t = text.lower()
    return sum(1 for k in SECURITY_CONTEXT if k in t) >= 2

def extract_nested_links(html: str, base_url: str, limit=5) -> list:
    soup = BeautifulSoup(html, "html.parser")
    article = soup.find("article") or soup.find("main")
    if not article:
        return []
    
    results = []
    seen = set()
    
    for p in article.find_all(["p", "li"]):
        for a in p.find_all("a", href=True):
            anchor = a.get_text(strip=True).lower()
            if not anchor or anchor in LOW_SIGNAL_ANCHORS:
                continue
            
            href = urljoin(base_url, a["href"])
            domain = urlparse(href).netloc.lower()
            
            if any(b in domain for b in BLOCKED_DOMAINS):
                continue
            
            score = sum(1 for k in HIGH_SIGNAL_ANCHORS if k in anchor)
            if score == 0 or href in seen:
                continue
            
            results.append({"url": href, "anchor": anchor, "score": score})
            seen.add(href)
            if len(results) >= limit:
                return sorted(results, key=lambda x: x["score"], reverse=True)
    
    return sorted(results, key=lambda x: x["score"], reverse=True)