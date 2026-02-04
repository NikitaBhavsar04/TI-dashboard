#!/usr/bin/env python3
"""
Telegram → Raw Article Fetcher (OpenSearch-backed, hardened)
- nested_links matches mapping: nested[{url(keyword), text(text)}] [web:67]
- inline-only link extraction from Readability main content [web:83]
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import asyncio
import socket
import time
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Set
from urllib.parse import urlparse, urljoin, urlunparse, parse_qsl, urlencode

import requests
from bs4 import BeautifulSoup
from readability.readability import Document
from telethon import TelegramClient
from opensearchpy import helpers
from utils.opensearch_client import get_opensearch_client
from dotenv import load_dotenv

from utils.common import logger, sha1, read_yaml
import article_utils

# -------------------------------------------------------------------
# ENV + HARD NETWORK SAFETY
# -------------------------------------------------------------------
load_dotenv()
socket.setdefaulttimeout(10)

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
cfg = read_yaml("config.yaml")

API_ID = int(os.getenv("TELEGRAM_API_ID"))
API_HASH = os.getenv("TELEGRAM_API_HASH")
PHONE_NUMBER = os.getenv("TELEGRAM_PHONE_NUMBER")

tg_cfg = cfg.get("telegram", {})
SESSION_NAME = tg_cfg.get("session_name", "telegram_scraper_session")
TELEGRAM_CHANNELS = tg_cfg.get("channels", [])
MESSAGE_LIMIT_PER_RUN = tg_cfg.get("message_limit_per_run", 50)

DAYS_BACK = 10
MAX_WORKERS = 6
PER_HOST_MIN_DELAY = 0.2

if not API_ID or not API_HASH or not PHONE_NUMBER:
    raise RuntimeError("[CONFIG ERROR] Missing Telegram credentials in .env")

if not TELEGRAM_CHANNELS:
    raise RuntimeError("[TELEGRAM] No channels configured in config.yaml")

# -------------------------------------------------------------------
# OPENSEARCH CLIENT
# -------------------------------------------------------------------
INDEX = "ti-raw-articles"
os_client = get_opensearch_client()

# -------------------------------------------------------------------
# CONSTANTS
# -------------------------------------------------------------------
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

BLOCKED_DOMAINS = ("youtube.com", "youtu.be", "t.me", "reddit.com", "redd.it", "i.redd.it")
BLOCKED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip", ".exe", ".dmg")
URL_RE = re.compile(r"https?://\S+")

TRACKING_PARAMS = {
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","mc_cid","mc_eid"
}

INLINE_PARENTS = {"p", "li", "blockquote", "h1", "h2", "h3", "h4"}
BAD_PATH_PREFIXES = ("/tag/", "/author/", "/category/", "/newsletter", "/gsearch")

# -------------------------------------------------------------------
# RATE LIMITING
# -------------------------------------------------------------------
session = requests.Session()
session.headers.update(HEADERS)
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
        return urlunparse((p.scheme, p.netloc, p.path, "", urlencode(q, doseq=True), ""))
    except Exception:
        return u

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
# URL / FETCH
# -------------------------------------------------------------------
def is_valid_article_url(url: str) -> bool:
    u = url.lower()
    if any(bad in u for bad in BLOCKED_DOMAINS):
        return False
    if any(u.endswith(ext) for ext in BLOCKED_EXTENSIONS):
        return False
    return True

def expand_url(url: str) -> str:
    _rate_limit_host(url)
    try:
        r = session.head(url, allow_redirects=True, timeout=8)
        return r.url
    except Exception:
        return url

def fetch_html(url: str) -> str:
    _rate_limit_host(url)
    try:
        r = session.get(url, timeout=12, allow_redirects=True)
        if r.status_code == 200 and len(r.text) > 500:
            r.encoding = r.encoding or r.apparent_encoding
            return r.text.encode("utf-8", "ignore").decode("utf-8", "ignore")
    except Exception:
        pass
    return ""

# -------------------------------------------------------------------
# INLINE NESTED LINKS (mapping compatible)
# -------------------------------------------------------------------
def extract_nested_links_inline(raw_html: str, base_url: str, max_links: int = 20) -> List[Dict[str, str]]:
    """
    Returns: [{"url": "...", "text": "..."}] to match nested mapping. [web:67]
    Uses Readability main content + inline-only filtering. [web:83]
    """
    try:
        base = normalize_url(base_url)
        base_netloc = urlparse(base).netloc.lower()

        content_html = Document(raw_html).summary(html_partial=True)  # [web:83]
        soup = BeautifulSoup(content_html, "html.parser")

        out: List[Dict[str, str]] = []
        seen: Set[str] = set()

        for a in soup.find_all("a", href=True):
            href = (a.get("href") or "").strip()
            if not href or href.startswith(("mailto:", "javascript:", "tel:", "#")):
                continue

            anchor_text = a.get_text(" ", strip=True) or ""
            if len(anchor_text) < 2:
                continue

            parent = a.parent.name.lower() if a.parent and getattr(a.parent, "name", None) else ""
            if parent not in INLINE_PARENTS:
                continue

            abs_u = normalize_url(urljoin(base, href))  # relative -> absolute [web:109]
            if not abs_u.startswith(("http://", "https://")):
                continue

            # same-host (keep your previous behavior)
            if urlparse(abs_u).netloc.lower() != base_netloc:
                continue

            if abs_u.lower().endswith(BLOCKED_EXTENSIONS):
                continue

            path = urlparse(abs_u).path or ""
            if path.startswith(BAD_PATH_PREFIXES):
                continue

            if abs_u == base or abs_u in seen:
                continue

            seen.add(abs_u)
            out.append({"url": abs_u, "text": anchor_text[:300]})

            if len(out) >= max_links:
                break

        return out
    except Exception:
        return []

# -------------------------------------------------------------------
# ARTICLE PROCESSOR
# -------------------------------------------------------------------
def process_article(job: Tuple[str, str, str]) -> Dict | None:
    msg_key, url, source_label = job

    url = normalize_url(expand_url(url))
    if not is_valid_article_url(url):
        return None

    url_hash = sha1(url)
    if url_exists(url_hash):
        return None

    raw_html = fetch_html(url)
    if not raw_html:
        return None

    text = article_utils.extract_article_text(raw_html)
    if not text or not article_utils.has_security_context(text):
        return None

    title = article_utils.extract_title(raw_html)
    cves = article_utils.extract_cves(text)

    nested = extract_nested_links_inline(raw_html, url)

    incident_key = (
        "CVE::" + ",".join(sorted(cves))
        if cves else
        "TEXT::" + sha1((title + text[:2000]).lower())
    )

    if incident_exists(incident_key):
        return None

    logger.info(f"[TG][OK] Ingested | msg={msg_key} | incident={incident_key}")

    return {
        "id": url_hash,
        "incident_key": incident_key,
        "title": title,
        "source": source_label,
        "article_url": url,
        "published": None,
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "summary": text[:2000],
        "article_text": text,
        "nested_links": nested,   # <-- correct type: nested array of objects
        "cves": sorted(cves),
        "status": "NEW",
        "source_type": "TELEGRAM",
    }

# -------------------------------------------------------------------
# TELEGRAM COLLECTOR
# -------------------------------------------------------------------
async def collect_jobs() -> List[Tuple[str, str, str]]:
    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start(phone=PHONE_NUMBER)

    jobs: List[Tuple[str, str, str]] = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)

    for channel in TELEGRAM_CHANNELS:
        logger.info(f"[TG] Scanning: {channel}")

        async for msg in client.iter_messages(channel, limit=MESSAGE_LIMIT_PER_RUN):
            if not msg.text or not msg.date or msg.date < cutoff:
                continue

            msg_key = f"{msg.chat_id}:{msg.id}"
            urls = URL_RE.findall(msg.text)

            for u in urls:
                jobs.append((msg_key, u, f"Telegram:{channel}"))

        await asyncio.sleep(0.5)

    await client.disconnect()
    logger.info(f"[TG] Jobs collected: {len(jobs)}")
    return jobs

# -------------------------------------------------------------------
# MAIN
# -------------------------------------------------------------------
async def main_async():
    jobs = await collect_jobs()
    articles: List[Dict] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as exe:
        futures = [exe.submit(process_article, job) for job in jobs]
        for f in as_completed(futures):
            try:
                res = f.result()
                if res:
                    articles.append(res)
            except Exception as e:
                logger.warning(f"[TG] Worker error: {e}")

    if not articles:
        logger.info("[TG] No new incidents")
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

    success, errors = helpers.bulk(os_client, actions, raise_on_error=False, raise_on_exception=False)
    if errors:
        logger.error(f"[TG][BULK] failures={len(errors)} (showing up to 3)")
        for item in errors[:3]:
            logger.error(f"[TG][BULK][FAIL] {item}")

    logger.info(f"[TG][DONE] New incidents indexed: {success}")

def run_once():
    asyncio.run(main_async())

if __name__ == "__main__":
    run_once()