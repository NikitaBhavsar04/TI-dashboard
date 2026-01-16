#!/usr/bin/env python3
"""
Telegram → Raw Article Fetcher (SOC-grade, OpenSearch-backed, hardened)
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
from typing import List, Dict, Tuple

import requests
from telethon import TelegramClient
from opensearchpy import OpenSearch, helpers

from utils.common import logger, sha1, read_yaml
import article_utils

# -------------------------------------------------------------------
# HARD NETWORK SAFETY
# -------------------------------------------------------------------

socket.setdefaulttimeout(10)

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------

cfg = read_yaml("config.yaml")

tg_cfg = cfg.get("telegram", {})
API_ID = tg_cfg.get("api_id")
API_HASH = tg_cfg.get("api_hash")
PHONE_NUMBER = tg_cfg.get("phone_number")
SESSION_NAME = tg_cfg.get("session_name", "telegram_scraper_session")

TELEGRAM_CHANNELS = tg_cfg.get("channels", [])
MESSAGE_LIMIT_PER_RUN = tg_cfg.get("message_limit_per_run", 50)

DAYS_BACK = 10
MAX_WORKERS = 6
PER_HOST_MIN_DELAY = 0.2

REQUIRED_TG_FIELDS = [("api_id", API_ID), ("api_hash", API_HASH), ("phone_number", PHONE_NUMBER)]
for name, value in REQUIRED_TG_FIELDS:
    if not value:
        raise RuntimeError(f"[CONFIG ERROR] Missing telegram.{name} in config.yaml")

if not TELEGRAM_CHANNELS:
    raise RuntimeError("[TELEGRAM] No channels configured")

# -------------------------------------------------------------------
# OPENSEARCH CONFIG (SAME INDEX AS RSS)
# -------------------------------------------------------------------

OPENSEARCH_HOST = cfg.get("opensearch", {}).get("host", "localhost")
OPENSEARCH_PORT = cfg.get("opensearch", {}).get("port", 9200)
INDEX = cfg.get("opensearch", {}).get("index", "raw-articles")

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
# CONSTANTS
# -------------------------------------------------------------------

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

BLOCKED_DOMAINS = ("youtube.com", "youtu.be", "t.me", "reddit.com", "redd.it", "i.redd.it")
BLOCKED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip", ".exe")

URL_RE = re.compile(r"https?://\S+")

# -------------------------------------------------------------------
# RATE LIMITING
# -------------------------------------------------------------------

session = requests.Session()
session.headers.update(HEADERS)
_last_host_access: dict[str, float] = {}

def _rate_limit_host(url: str):
    from urllib.parse import urlparse
    host = urlparse(url).netloc
    now = time.time()
    last = _last_host_access.get(host, 0)
    if now - last < PER_HOST_MIN_DELAY:
        time.sleep(PER_HOST_MIN_DELAY - (now - last))
    _last_host_access[host] = time.time()

# -------------------------------------------------------------------
# OPENSEARCH DEDUP
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
        r = session.get(url, timeout=12)
        if r.status_code == 200 and len(r.text) > 500:
            r.encoding = r.encoding or r.apparent_encoding
            return r.text.encode("utf-8", "ignore").decode("utf-8", "ignore")
    except Exception:
        pass
    return ""

# -------------------------------------------------------------------
# ARTICLE PROCESSOR
# -------------------------------------------------------------------

def process_article(job: Tuple[str, str, str]) -> Dict | None:
    msg_key, url, source_label = job

    url = expand_url(url)
    if not is_valid_article_url(url):
        return None

    url_hash = sha1(url)
    if url_exists(url_hash):
        return None

    html = fetch_html(url)
    if not html:
        return None

    text = article_utils.extract_article_text(html)
    if not text or not article_utils.has_security_context(text):
        return None

    title = article_utils.extract_title(html)
    cves = article_utils.extract_cves(text)
    nested = article_utils.extract_nested_links(html, url)

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
        "nested_links": nested,
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

    jobs = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)

    for channel in TELEGRAM_CHANNELS:
        logger.info(f"[TG] Scanning: {channel}")

        async for msg in client.iter_messages(channel, limit=MESSAGE_LIMIT_PER_RUN):
            if not msg.text or not msg.date or msg.date < cutoff:
                continue

            msg_key = f"{msg.chat_id}:{msg.id}"
            urls = URL_RE.findall(msg.text)

            for url in urls:
                jobs.append((msg_key, url, f"Telegram:{channel}"))

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

    success, _ = helpers.bulk(os_client, actions, raise_on_error=False)
    logger.info(f"[TG][DONE] New incidents indexed: {success}")

def run_once():
    asyncio.run(main_async())

if __name__ == "__main__":
    run_once()