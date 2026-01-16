#!/usr/bin/env python3
"""
Reddit → Raw Article Fetcher (SOC-grade, OpenSearch-backed, hardened)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import socket
from datetime import datetime
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict

import requests
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

reddit_cfg = cfg.get("reddit", {})
SUBREDDITS = reddit_cfg.get("subreddits", [])
MAX_POSTS_PER_SUBREDDIT = reddit_cfg.get("max_posts_per_subreddit", 100)
REQUEST_TIMEOUT = reddit_cfg.get("request_timeout", 30)

if not SUBREDDITS:
    raise RuntimeError("[REDDIT] No subreddits configured")

REDDIT_USER_AGENT = (
    reddit_cfg.get("user_agent")
    or os.getenv("REDDIT_USER_AGENT", "python:threatadvisory-soc:v1.0")
)

MAX_WORKERS = 6
HTML_TIMEOUT = 12
PER_HOST_MIN_DELAY = 0.2

# -------------------------------------------------------------------
# OPENSEARCH CONFIG (SAME INDEX AS RSS + TELEGRAM)
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
# HTTP SESSION
# -------------------------------------------------------------------

HEADERS = {"User-Agent": REDDIT_USER_AGENT}
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
# URL / HTML
# -------------------------------------------------------------------

def is_valid_url(url: str) -> bool:
    domain = urlparse(url).netloc.lower()
    if domain.startswith("i.redd.it"):
        return False
    if domain in ("reddit.com", "www.reddit.com", "old.reddit.com"):
        return False
    if url.lower().endswith((".jpg", ".png", ".gif", ".jpeg", ".webp", ".mp4")):
        return False
    return True

def fetch_html(url: str) -> str:
    _rate_limit_host(url)
    try:
        r = session.get(url, timeout=HTML_TIMEOUT)
        if r.status_code != 200 or not r.text or len(r.text) < 500:
            return ""
        r.encoding = r.encoding or r.apparent_encoding
        return r.text.encode("utf-8", "ignore").decode("utf-8", "ignore")
    except Exception:
        return ""

# -------------------------------------------------------------------
# REDDIT API
# -------------------------------------------------------------------

def fetch_subreddit(sub: str) -> List[dict]:
    url = f"https://www.reddit.com/r/{sub}/new.json?limit={MAX_POSTS_PER_SUBREDDIT}"
    try:
        r = session.get(url, timeout=REQUEST_TIMEOUT)
        if not r.ok:
            logger.warning(f"[REDDIT] Failed /r/{sub} | status={r.status_code}")
            return []
        data = r.json()
        return [c["data"] for c in data.get("data", {}).get("children", [])]
    except Exception as e:
        logger.warning(f"[REDDIT] Fetch failed /r/{sub} | {e}")
        return []

# -------------------------------------------------------------------
# POST PROCESSOR
# -------------------------------------------------------------------

def process_post(post: dict) -> Dict | None:
    try:
        url = post.get("url")
        if not url or not is_valid_url(url):
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

        title = article_utils.extract_title(html) or post.get("title", "")
        cves = article_utils.extract_cves(text)
        nested = article_utils.extract_nested_links(html, url)

        incident_key = (
            "CVE::" + ",".join(sorted(cves))
            if cves else
            "TEXT::" + sha1((title + text[:2000]).lower())
        )

        if incident_exists(incident_key):
            return None

        logger.info(f"[REDDIT][OK] Ingested | incident={incident_key}")

        return {
            "id": url_hash,
            "incident_key": incident_key,
            "title": title,
            "source": f"Reddit:r/{post.get('subreddit')}",
            "article_url": url,
            "published": datetime.utcfromtimestamp(post["created_utc"]).isoformat() + "Z",
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "summary": text[:2000],
            "article_text": text,
            "nested_links": nested,
            "cves": sorted(cves),
            "status": "NEW",
            "source_type": "REDDIT",
        }

    except Exception as e:
        logger.warning(f"[REDDIT] Post skipped | {e}")
        return None

# -------------------------------------------------------------------
# MAIN
# -------------------------------------------------------------------

def main():
    jobs: List[dict] = []

    for sub in SUBREDDITS:
        logger.info(f"[REDDIT] Fetching /r/{sub}")
        jobs.extend(fetch_subreddit(sub))
        time.sleep(0.5)

    logger.info(f"[REDDIT] Posts collected: {len(jobs)}")

    articles: List[Dict] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as exe:
        futures = [exe.submit(process_post, p) for p in jobs]
        for f in as_completed(futures):
            try:
                res = f.result()
                if res:
                    articles.append(res)
            except Exception as e:
                logger.warning(f"[REDDIT] Worker error | {e}")

    if not articles:
        logger.info("[REDDIT] No new incidents")
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
    logger.info(f"[REDDIT][DONE] New incidents indexed: {success}")

if __name__ == "__main__":
    main()