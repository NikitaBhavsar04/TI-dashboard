#!/usr/bin/env python3
"""
RSS → Raw Article Fetcher (SOC-grade, OpenSearch-backed, hardened)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import time
import socket
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

import requests
import feedparser
from bs4 import BeautifulSoup
from readability import Document
from dateutil import parser as dateparser
from opensearchpy import OpenSearch, helpers

from utils.common import logger, sha1, read_yaml
import article_utils

# -------------------------------------------------------------------
# HARD NETWORK SAFETY (CRITICAL)
# -------------------------------------------------------------------

socket.setdefaulttimeout(10)

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------

cfg = read_yaml("config.yaml")
SOURCES = cfg["sources"]["rss"]

OPENSEARCH_HOST = cfg.get("opensearch", {}).get("host", "localhost")
OPENSEARCH_PORT = cfg.get("opensearch", {}).get("port", 9200)
INDEX = cfg.get("opensearch", {}).get("index", "ti-raw-articles")

MAX_WORKERS = 6
HTTP_TIMEOUT = 12
DAYS_BACK = 18
MAX_ARTICLE_TEXT = 20000
MIN_ARTICLE_LENGTH = 800

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36"
}

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign",
    "utm_term", "utm_content", "gclid", "fbclid"
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

# -------------------------------------------------------------------
# OPENSEARCH CLIENT (TUNED)
# -------------------------------------------------------------------

os_client = OpenSearch(
    hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
    use_ssl=False,
    verify_certs=False,
    http_compress=True,
    timeout=30,
    max_retries=3,
    retry_on_timeout=True,
)

# -------------------------------------------------------------------
# RATE LIMITING
# -------------------------------------------------------------------

_last_host_access: dict[str, float] = {}
PER_HOST_MIN_DELAY = 0.2

def _rate_limit_host(url: str):
    host = urlparse(url).netloc
    now = time.time()
    last = _last_host_access.get(host, 0)
    if now - last < PER_HOST_MIN_DELAY:
        time.sleep(PER_HOST_MIN_DELAY - (now - last))
    _last_host_access[host] = time.time()

# -------------------------------------------------------------------
# UTILS
# -------------------------------------------------------------------

def normalize_url(url: str) -> str:
    try:
        p = urlparse(url)
        q = [(k, v) for k, v in parse_qsl(p.query) if k.lower() not in TRACKING_PARAMS]
        return urlunparse((p.scheme, p.netloc, p.path, "", urlencode(q), ""))
    except Exception:
        return url

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
    t = text.lower()
    return any(k in t for k in POSITIVE_KEYWORDS)

def has_negative(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in NEGATIVE_KEYWORDS)

# -------------------------------------------------------------------
# OPENSEARCH DEDUP (FAST & SAFE)
# -------------------------------------------------------------------

def incident_doc_id(incident_key: str) -> str:
    return sha1(incident_key)

def incident_exists(incident_key: str) -> bool:
    try:
        return os_client.exists(index=INDEX, id=incident_doc_id(incident_key))
    except Exception:
        return False

def url_exists(url_hash: str) -> bool:
    q = {
        "size": 0,
        "query": {"term": {"id": url_hash}}
    }
    try:
        r = os_client.search(index=INDEX, body=q, request_timeout=5)
        return r["hits"]["total"]["value"] > 0
    except Exception:
        return False

# -------------------------------------------------------------------
# FETCH & EXTRACT
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
        return r.text
    except Exception:
        return ""

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
    t = text.lower()
    for m in CVE_RE.finditer(text):
        ctx = t[max(0, m.start()-120):m.end()+120]
        if any(k in ctx for k in SECURITY_CONTEXT):
            found.add(m.group(0).upper())
    return sorted(found)

def build_incident_key(title: str, text: str, cves: List[str]) -> str:
    if cves:
        return "CVE::" + ",".join(sorted(cves))
    return "TEXT::" + sha1((title + text[:2000]).lower())

# -------------------------------------------------------------------
# SAFE RSS PARSER (CRITICAL FIX)
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
    results = []

    feed = safe_parse_feed(feed_url)
    if not feed or getattr(feed, "bozo", False):
        return results

    for e in feed.entries:
        try:
            title = getattr(e, "title", "").strip()
            link = getattr(e, "link", "").strip()
            summary = getattr(e, "summary", "")
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

            html = fetch_html(url_n)
            if not html:
                continue

            text = extract_article_text(html)
            if not text or not has_positive(text):
                continue

            cves = extract_cves(title + summary + text)
            incident_key = build_incident_key(title, text, cves)

            if incident_exists(incident_key):
                continue

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
                "nested_links": article_utils.extract_nested_links(html, url_n),
                "cves": cves,
                "status": "NEW",
                "source_type": "RSS",
            })

        except Exception as e:
            logger.warning(f"[RSS] Entry skipped due to error: {e}")

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

    success, _ = helpers.bulk(os_client, actions, raise_on_error=False)
    logger.info(f"[RSS][DONE] New incidents indexed: {success}")

if __name__ == "__main__":
    main()