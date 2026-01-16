#!/usr/bin/env python3
"""
SOC RAW ARTICLE FETCHER – FINAL (CORRECT KEYWORD LOGIC)

✔ Positive keyword REQUIRED
✔ Negative keyword BLOCKED
✔ Nested link intelligence
✔ Incident-based dedup
✔ Stateful
"""

# ============================================================
# STANDARD LIBS
# ============================================================

import os
import json
import re
import socket
import requests
import feedparser

from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Set
from urllib.parse import urlparse, urljoin, parse_qsl, urlencode, urlunparse

# ============================================================
# THIRD PARTY
# ============================================================

from bs4 import BeautifulSoup
from readability.readability import Document
from dateutil import parser as dateparser

from utils.common import logger, sha1, read_yaml

# ============================================================
# HARDENING
# ============================================================

socket.setdefaulttimeout(15)

# ============================================================
# CONFIG
# ============================================================

cfg = read_yaml("config.yaml")

WORKSPACE = cfg.get("workspace", "./workspace")
SOURCES = cfg["sources"]["rss"]

RAW_FILE = os.path.join(WORKSPACE, "raw_articles.json")
SEEN_URL_FILE = os.path.join(WORKSPACE, "seen_urls.json")
SEEN_CONTENT_FILE = os.path.join(WORKSPACE, "seen_content.json")

MAX_WORKERS = 8
HTTP_TIMEOUT = 12
DAYS_BACK = 14

MAX_ARTICLE_TEXT = 20000
MAX_NESTED_TEXT = 5000
MAX_NESTED_LINKS = 5
MIN_ARTICLE_LENGTH = 800

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
}

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign",
    "utm_term", "utm_content", "gclid", "fbclid",
}

os.makedirs(WORKSPACE, exist_ok=True)

# ============================================================
# KEYWORD TRIAGE
# ============================================================

POSITIVE_KEYWORDS = {
    "vulnerability", "exploit", "zero-day", "0day",
    "cve", "remote code execution", "rce",
    "authentication bypass", "privilege escalation",
    "malware", "ransomware", "trojan", "worm",
    "spyware", "backdoor", "botnet",
    "breach", "compromise", "campaign",
    "apt", "threat actor", "phishing"
}

NEGATIVE_KEYWORDS = {
    "how to", "guide", "tutorial",
    "webinar", "conference",
    "career", "jobs", "training",
    "marketing", "announcement",
    "press release", "product launch"
}

# ============================================================
# CVE
# ============================================================

CVE_RE = re.compile(r"\bCVE-(?:19|20)\d{2}-\d{4,7}\b", re.I)
SECURITY_CONTEXT = {
    "vulnerability", "exploit", "security",
    "patch", "affected", "flaw", "cvss"
}

# ============================================================
# LOAD STATE
# ============================================================

existing_articles: List[Dict] = []
seen_urls: Set[str] = set()
seen_content: Set[str] = set()

if os.path.exists(RAW_FILE):
    try:
        with open(RAW_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                existing_articles = json.loads(content)
    except (json.JSONDecodeError, ValueError):
        logger.warning(f"[WARN] Could not parse {RAW_FILE}, starting fresh")

for path, target in [
    (SEEN_URL_FILE, seen_urls),
    (SEEN_CONTENT_FILE, seen_content),
]:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    target.update(json.loads(content))
        except (json.JSONDecodeError, ValueError):
            logger.warning(f"[WARN] Could not parse {path}, starting fresh")

# ============================================================
# HELPERS
# ============================================================

def normalize_url(url: str) -> str:
    try:
        p = urlparse(url)
        q = [(k, v) for k, v in parse_qsl(p.query) if k.lower() not in TRACKING_PARAMS]
        return urlunparse((p.scheme, p.netloc, p.path, "", urlencode(q), ""))
    except Exception:
        return url


def parse_date(raw):
    try:
        dt = dateparser.parse(raw)
        if dt and dt.tzinfo:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def is_recent(dt):
    return bool(dt and dt >= datetime.utcnow() - timedelta(days=DAYS_BACK))


def has_positive(text: str) -> bool:
    return any(k in text.lower() for k in POSITIVE_KEYWORDS)


def has_negative(text: str) -> bool:
    return any(k in text.lower() for k in NEGATIVE_KEYWORDS)


def fetch_html(url: str) -> str:
    try:
        r = requests.get(url, headers=HEADERS, timeout=HTTP_TIMEOUT, allow_redirects=True)
        if r.status_code != 200 or not r.text or len(r.text) < 300:
            return ""
        return r.text
    except Exception:
        return ""

# ============================================================
# CONTENT EXTRACTION
# ============================================================

def extract_article_text(html: str, limit: int) -> str:
    if not html or len(html) < 500:
        return ""

    try:
        doc = Document(html)
        content = doc.summary(html_partial=True)
        if content:
            soup = BeautifulSoup(content, "html.parser")
            for t in soup(["script", "style", "nav", "footer", "aside"]):
                t.decompose()
            text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
            if len(text) >= MIN_ARTICLE_LENGTH:
                return text[:limit]
    except Exception:
        pass

    try:
        soup = BeautifulSoup(html, "html.parser")
        for t in soup(["script", "style", "nav", "footer", "aside"]):
            t.decompose()
        for sel in ["article", "main", "div.post", "div.entry-content"]:
            el = soup.select_one(sel)
            if el:
                text = re.sub(r"\s+", " ", el.get_text(" ", strip=True))
                if len(text) >= MIN_ARTICLE_LENGTH:
                    return text[:limit]
    except Exception:
        pass

    return ""

def extract_article_links(html: str, base_url: str) -> List[str]:
    soup = BeautifulSoup(html, "html.parser")
    article = soup.find("article") or soup.find("main")
    if not article:
        return []

    links = []
    for a in article.find_all("a", href=True):
        href = normalize_url(urljoin(base_url, a["href"]))
        if href.startswith("http"):
            links.append(href)

    return list(dict.fromkeys(links))[:MAX_NESTED_LINKS]

def classify_link(url: str) -> str:
    u = url.lower()
    if "nvd.nist.gov" in u or "cve" in u:
        return "cve"
    if "github.com" in u:
        return "github"
    if "advisory" in u or "security" in u:
        return "vendor"
    return "other"

def extract_cves(text: str) -> List[str]:
    found = set()
    t = text.lower()
    for m in CVE_RE.finditer(text):
        ctx = t[max(0, m.start()-120):m.end()+120]
        if any(k in ctx for k in SECURITY_CONTEXT):
            found.add(m.group(0).upper())
    return list(found)

def build_incident_key(title: str, text: str, cves: List[str]) -> str:
    if cves:
        return "CVE::" + ",".join(sorted(cves))
    return "TEXT::" + sha1((title + text[:2000]).lower())

# ============================================================
# RSS FETCHER
# ============================================================

def fetch_rss(url: str) -> List[Dict]:
    results = []

    try:
        feed = feedparser.parse(url)
    except Exception:
        return results

    if not feed or getattr(feed, "bozo", False):
        return results

    for e in feed.entries:
        title = getattr(e, "title", "").strip()
        link = getattr(e, "link", "").strip()
        summary = getattr(e, "summary", "")

        combined = f"{title} {summary}"

        if has_negative(combined) or not has_positive(combined):
            continue

        dt = parse_date(getattr(e, "published", None) or getattr(e, "updated", None))
        if not title or not link or not is_recent(dt):
            continue

        url_n = normalize_url(link)
        if sha1(url_n) in seen_urls:
            continue

        html = fetch_html(url_n)
        text = extract_article_text(html, MAX_ARTICLE_TEXT)

        if not text or not has_positive(text):
            continue

        nested_sources = []
        for nurl in extract_article_links(html, url_n):
            nhtml = fetch_html(nurl)
            ntext = extract_article_text(nhtml, MAX_NESTED_TEXT)
            if ntext:
                nested_sources.append({
                    "url": nurl,
                    "type": classify_link(nurl),
                    "text": ntext
                })

        cves = set(extract_cves(title + summary + text))
        for n in nested_sources:
            if n["type"] in {"cve", "vendor"}:
                cves.update(extract_cves(n["text"]))

        ikey = build_incident_key(title, text, list(cves))

        results.append({
            "id": sha1(url_n),
            "incident_key": ikey,
            "title": title,
            "source": feed.feed.get("title", url),
            "article_url": url_n,
            "published": dt.isoformat() if dt else None,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "summary": summary[:2000],
            "article_text": text,
            "nested_links": nested_sources,
            "cves": sorted(cves),
            "status": "NEW"
        })

        seen_urls.add(sha1(url_n))
        seen_content.add(sha1(text))

    return results

# ============================================================
# MAIN
# ============================================================

new_articles = []

with ThreadPoolExecutor(max_workers=MAX_WORKERS) as exe:
    futures = [exe.submit(fetch_rss, u) for u in SOURCES]
    for f in as_completed(futures):
        new_articles.extend(f.result())

# ============================================================
# MERGE + DEDUP
# ============================================================

final = {}
for a in existing_articles + new_articles:
    k = a["incident_key"]
    if k not in final or len(a["article_text"]) > len(final[k]["article_text"]):
        final[k] = a

final_articles = list(final.values())

# ============================================================
# SAVE
# ============================================================

json.dump(final_articles, open(RAW_FILE, "w", encoding="utf-8"), indent=2)
json.dump(sorted(seen_urls), open(SEEN_URL_FILE, "w", encoding="utf-8"), indent=2)
json.dump(sorted(seen_content), open(SEEN_CONTENT_FILE, "w", encoding="utf-8"), indent=2)

logger.info(f"[DONE] Total incidents stored: {len(final_articles)}")
logger.info(f"[DONE] New incidents stored: {len(new_articles)}")