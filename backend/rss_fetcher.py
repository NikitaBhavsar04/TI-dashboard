#!/usr/bin/env python3
"""
RSS → Raw Article Fetcher (SOC-grade, OpenSearch-backed, hardened)
- Compatible with your OpenSearch mapping:
  nested_links: type=nested with {url, text}
- dynamic: strict safe (no new fields added)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import time
import socket
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Set, Optional
from urllib.parse import urlparse, urljoin, urlunparse, parse_qsl, urlencode
from dotenv import load_dotenv
import requests
import feedparser
from bs4 import BeautifulSoup
from readability import Document
from dateutil import parser as dateparser
from opensearchpy import helpers
from utils.opensearch_client import get_opensearch_client

from utils.common import logger, sha1, read_yaml
import article_utils
INLINE_PARENTS = {"p", "li", "blockquote", "h1", "h2", "h3", "h4"}
BAD_PATH_PREFIXES = ("/tag/", "/author/", "/category/", "/newsletter", "/gsearch")

# -------------------------------------------------------------------
# HARD NETWORK SAFETY
# -------------------------------------------------------------------
socket.setdefaulttimeout(10)

load_dotenv()
# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
cfg = read_yaml("config.yaml")
# Filter enabled RSS feeds and extract URLs
SOURCES = [
    feed["url"] 
    for feed in cfg["sources"]["rss"] 
    if feed.get("enabled", True)
]

INDEX = cfg.get("opensearch", {}).get("index", "ti-raw-articles")

MAX_WORKERS = 6
HTTP_TIMEOUT = 12
DAYS_BACK = 22
MAX_ARTICLE_TEXT = 20000
MIN_ARTICLE_LENGTH = 800
PER_HOST_MIN_DELAY = 0.2

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"
}

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "mc_cid", "mc_eid"
}

POSITIVE_KEYWORDS = {
    "vulnerability", "exploit", "zero-day", "0day", "cve",
    "remote code execution", "rce", "authentication bypass",
    "privilege escalation", "malware", "ransomware",
    "trojan", "worm", "spyware", "backdoor", "botnet",
    "breach", "compromise", "campaign", "apt",
    "threat actor", "phishing"
}

NEGATIVE_KEYWORDS = {
    "how to", "guide", "tutorial", "webinar",
    "conference", "career", "jobs", "training",
    "marketing", "press release", "product launch"
}

CVE_RE = re.compile(r"\bCVE-(?:19|20)\d{2}-\d{4,7}\b", re.I)
SECURITY_CONTEXT = {"vulnerability", "exploit", "security", "patch", "affected", "flaw", "cvss"}

BLOCKED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".pdf", ".zip", ".exe", ".dmg")


# -------------------------------------------------------------------
# OPENSEARCH CLIENT
# -------------------------------------------------------------------
os_client = get_opensearch_client()

# -------------------------------------------------------------------
# RATE LIMIT
# -------------------------------------------------------------------
_last_host_access: dict[str, float] = {}

def _rate_limit_host(url: str):
    host = urlparse(url).netloc
    now = time.time()
    last = _last_host_access.get(host, 0)
    if now - last < PER_HOST_MIN_DELAY:
        time.sleep(PER_HOST_MIN_DELAY - (now - last))
    _last_host_access[host] = time.time()


# -------------------------------------------------------------------
# URL UTILS
# -------------------------------------------------------------------
def normalize_url(u: str) -> str:
    try:
        p = urlparse(u)
        q = [(k, v) for (k, v) in parse_qsl(p.query, keep_blank_values=True) if k.lower() not in TRACKING_PARAMS]
        q = sorted(q, key=lambda kv: kv[0].lower())
        return urlunparse((p.scheme, p.netloc, p.path, "", urlencode(q, doseq=True), ""))  # strip fragment
    except Exception:
        return u


# -------------------------------------------------------------------
# NESTED LINKS (MAPPING-COMPATIBLE)
# nested_links: [{ "url": keyword, "text": text }]
# -------------------------------------------------------------------
def extract_nested_links(raw_html: str, base_url: str, max_links: int = 20) -> list[dict]:
    """
    nested_links: type=nested -> list of {"url": keyword, "text": text} [web:67]
    Goal: keep only inline "blue word" links (anchors inside real text blocks).
    """
    try:
        base = normalize_url(base_url)
        base_netloc = urlparse(base).netloc.lower()

        content_html = Document(raw_html).summary(html_partial=True)  # main content HTML [web:83]
        soup = BeautifulSoup(content_html, "html.parser")

        out: list[dict] = []
        seen: set[str] = set()

        for a in soup.find_all("a", href=True):
            href = (a.get("href") or "").strip()
            if not href or href.startswith(("mailto:", "javascript:", "tel:", "#")):
                continue

            anchor_text = a.get_text(" ", strip=True) or ""
            if len(anchor_text) < 2:
                continue

            parent = a.parent.name.lower() if getattr(a, "parent", None) and getattr(a.parent, "name", None) else ""
            if parent not in INLINE_PARENTS:
                continue  # drop nav/cards/buttons/etc. [web:81]

            abs_u = normalize_url(urljoin(base, href))
            if not abs_u.startswith(("http://", "https://")):
                continue

            # same-host only (change this if you want external refs)
            if urlparse(abs_u).netloc.lower() != base_netloc:
                continue

            if abs_u.lower().endswith(BLOCKED_EXTENSIONS):
                continue

            path = urlparse(abs_u).path or ""
            if path.startswith(BAD_PATH_PREFIXES):
                continue

            if abs_u == base:
                continue
            if abs_u in seen:
                continue
            seen.add(abs_u)

            out.append({"url": abs_u, "text": anchor_text[:300]})
            if len(out) >= max_links:
                break

        return out
    except Exception:
        return []


# -------------------------------------------------------------------
# FILTERS
# -------------------------------------------------------------------
def parse_date(raw):
    if not raw:
        return None
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
    t = (text or "").lower()
    return any(k in t for k in POSITIVE_KEYWORDS)

def has_negative(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in NEGATIVE_KEYWORDS)


# -------------------------------------------------------------------
# DEDUP
# -------------------------------------------------------------------
def incident_doc_id(incident_key: str) -> str:
    return sha1(incident_key)

def incident_exists(incident_key: str) -> bool:
    try:
        return os_client.exists(index=INDEX, id=incident_doc_id(incident_key))
    except Exception:
        return False

def url_exists(url_hash: str) -> bool:
    q = {"size": 0, "query": {"term": {"id": url_hash}}}
    try:
        r = os_client.search(index=INDEX, body=q, request_timeout=5)
        return r["hits"]["total"]["value"] > 0
    except Exception:
        return False


# -------------------------------------------------------------------
# HTTP
# -------------------------------------------------------------------
session = requests.Session()
session.headers.update(HEADERS)

def fetch_html(url: str) -> str:
    _rate_limit_host(url)
    try:
        r = session.get(url, timeout=HTTP_TIMEOUT, allow_redirects=True)
        if r.status_code != 200 or not r.text or len(r.text) < 300:
            return ""
        r.encoding = r.encoding or r.apparent_encoding
        return r.text.encode("utf-8", "ignore").decode("utf-8", "ignore")
    except Exception:
        return ""


# -------------------------------------------------------------------
# EXTRACTION
# -------------------------------------------------------------------
def extract_article_text(html: str) -> str:
    if not html or len(html) < 500:
        return ""
    html = html.encode("utf-8", "ignore").decode("utf-8", "ignore")

    try:
        doc = Document(html)
        soup = BeautifulSoup(doc.summary(html_partial=True), "html.parser")
        for t in soup(["script", "style", "nav", "footer", "aside"]):
            t.decompose()
        text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))
        if len(text) >= MIN_ARTICLE_LENGTH:
            return text[:MAX_ARTICLE_TEXT]
    except Exception:
        pass

    return ""

def extract_cves(text: str) -> List[str]:
    found = set()
    t = (text or "").lower()
    for m in CVE_RE.finditer(text or ""):
        ctx = t[max(0, m.start() - 120): m.end() + 120]
        if any(k in ctx for k in SECURITY_CONTEXT):
            found.add(m.group(0).upper())
    return sorted(found)

def build_incident_key(title: str, text: str, cves: List[str]) -> str:
    if cves:
        return "CVE::" + ",".join(sorted(cves))
    return "TEXT::" + sha1(((title or "") + (text or "")[:2000]).lower())


# -------------------------------------------------------------------
# SAFE RSS PARSER
# -------------------------------------------------------------------
def safe_parse_feed(feed_url: str):
    try:
        return feedparser.parse(feed_url)
    except TimeoutError:
        logger.warning(f"[RSS] Feed timeout: {feed_url}")
    except Exception as e:
        logger.warning(f"[RSS] Feed failed: {feed_url} ({e})")
    return None


# -------------------------------------------------------------------
# RSS WORKER
# -------------------------------------------------------------------
def fetch_rss(feed_url: str) -> List[Dict]:
    results: List[Dict] = []

    feed = safe_parse_feed(feed_url)
    if not feed or getattr(feed, "bozo", False):
        logger.warning(f"[RSS] Invalid feed/bozo: {feed_url}")
        return results

    for e in feed.entries:
        try:
            title = getattr(e, "title", "").strip()
            link = getattr(e, "link", "").strip()
            summary = getattr(e, "summary", "") or ""
            combined = f"{title} {summary}"

            if not title or not link:
                continue
            if has_negative(combined) or not has_positive(combined):
                continue

            dt = parse_date(getattr(e, "published", None) or getattr(e, "updated", None))
            if not is_recent(dt):
                continue

            url_n = normalize_url(link)
            url_hash = sha1(url_n)

            if url_exists(url_hash):
                continue

            raw_html = fetch_html(url_n)
            if not raw_html:
                continue

            text = extract_article_text(raw_html)
            if not text or not has_positive(text):
                continue

            cves = extract_cves(title + " " + summary + " " + text)
            incident_key = build_incident_key(title, text, cves)

            if incident_exists(incident_key):
                continue

            nested = extract_nested_links(raw_html, url_n)

            results.append({
                "id": url_hash,
                "incident_key": incident_key,
                "title": title,
                "source": feed.feed.get("title", feed_url),
                "article_url": url_n,
                "published": dt.isoformat() if dt else None,
                "fetched_at": datetime.utcnow().isoformat() + "Z",
                "summary": text[:2000],
                "article_text": text,
                "nested_links": nested,          # <-- MUST be list[ {url,text} ]
                "cves": cves,
                "status": "NEW",
                "source_type": "RSS",
            })

        except Exception as ex:
            logger.warning(f"[RSS] Entry skipped due to error: {ex}")

    return results


# -------------------------------------------------------------------
# MAIN
# -------------------------------------------------------------------
def main():
    articles: List[Dict] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as exe:
        futures = [exe.submit(fetch_rss, u) for u in SOURCES]
        for f in as_completed(futures):
            try:
                articles.extend(f.result())
            except Exception as e:
                logger.error(f"[RSS] Worker failed: {e}", exc_info=True)

    if not articles:
        logger.info("[RSS] No new incidents")
        return

    actions = [
        {
            "_op_type": "index",
            "_index": INDEX,
            "_id": incident_doc_id(a["incident_key"]),
            "_source": a
        }
        for a in articles
    ]

    success, errors = helpers.bulk(
        os_client,
        actions,
        raise_on_error=False,
        raise_on_exception=False,
    )

    if errors:
        logger.error(f"[RSS][BULK] failures={len(errors)} (showing up to 5)")
        for item in errors[:5]:
            logger.error(f"[RSS][BULK][FAIL] {item}")

    logger.info(f"[RSS][DONE] New incidents indexed: {success}")

if __name__ == "__main__":
    main()