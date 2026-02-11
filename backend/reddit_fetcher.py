#!/usr/bin/env python3
"""
Reddit → Raw Article Fetcher (OpenSearch-backed, hardened)
- nested_links matches mapping: nested[{url(keyword), text(text)}] [web:67]
- inline-only link extraction from Readability main content [web:83]
"""


import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import socket
from datetime import datetime
from urllib.parse import urlparse, urljoin, urlunparse, parse_qsl, urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional, Set

import requests
from bs4 import BeautifulSoup
from readability.readability import Document
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

reddit_cfg = cfg.get("reddit", {})
# Filter enabled subreddits and extract names
subreddits_config = reddit_cfg.get("subreddits", [])
SUBREDDITS = [
    sub["subreddit"] if isinstance(sub, dict) else sub
    for sub in subreddits_config
    if isinstance(sub, str) or (isinstance(sub, dict) and sub.get("enabled", True))
]
MAX_POSTS_PER_SUBREDDIT = reddit_cfg.get("max_posts_per_subreddit", 100)
REQUEST_TIMEOUT = reddit_cfg.get("request_timeout", 30)

if not SUBREDDITS:
    raise RuntimeError("[REDDIT] No subreddits configured or all disabled")

logger.info(f"[REDDIT] Enabled subreddits: {SUBREDDITS}")

REDDIT_USER_AGENT = (
    reddit_cfg.get("user_agent")
    or os.getenv("REDDIT_USER_AGENT", "python:threatadvisory-soc:v1.0")
)

MAX_WORKERS = 6
HTML_TIMEOUT = 12
PER_HOST_MIN_DELAY = 0.2

INDEX = "ti-raw-articles"
os_client = get_opensearch_client()

# -------------------------------------------------------------------
# HTTP SESSION
# -------------------------------------------------------------------
session = requests.Session()
session.headers.update({"User-Agent": REDDIT_USER_AGENT})

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
TRACKING_PARAMS = {
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","mc_cid","mc_eid"
}

BLOCKED_EXTENSIONS = (".jpg",".jpeg",".png",".gif",".webp",".mp4",".pdf",".zip",".exe",".dmg")
INLINE_PARENTS = {"p", "li", "blockquote", "h1", "h2", "h3", "h4"}
BAD_PATH_PREFIXES = ("/tag/", "/author/", "/category/", "/newsletter", "/gsearch")

def normalize_url(u: str) -> str:
    try:
        p = urlparse(u)
        q = [(k, v) for (k, v) in parse_qsl(p.query, keep_blank_values=True) if k.lower() not in TRACKING_PARAMS]
        q = sorted(q, key=lambda kv: kv[0].lower())
        return urlunparse((p.scheme, p.netloc, p.path, "", urlencode(q, doseq=True), ""))
    except Exception:
        return u

# -------------------------------------------------------------------
# nested_links extractor (inline-only + mapping compatible)
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

            abs_u = normalize_url(urljoin(base, href))  # [web:109]
            if not abs_u.startswith(("http://", "https://")):
                continue

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
# OPENSEARCH DEDUP
# -------------------------------------------------------------------
def incident_doc_id(incident_key: str) -> str:
    return sha1(incident_key)

def incident_exists(incident_key: str) -> bool:
    try:
        # Check if index exists first
        if not os_client.indices.exists(index=INDEX):
            logger.info(f"[REDDIT] Index '{INDEX}' does not exist, will be created on first insert")
            return False
        return os_client.exists(index=INDEX, id=incident_doc_id(incident_key))
    except Exception as e:
        logger.debug(f"[REDDIT] incident_exists check failed: {e}")
        return False

def url_exists(url_hash: str) -> bool:
    q = {"size": 0, "query": {"term": {"id": url_hash}}}
    try:
        # Check if index exists first
        if not os_client.indices.exists(index=INDEX):
            return False
        r = os_client.search(index=INDEX, body=q, request_timeout=5)
        return r["hits"]["total"]["value"] > 0
    except Exception as e:
        logger.debug(f"[REDDIT] url_exists check failed: {e}")
        return False

# -------------------------------------------------------------------
# REDDIT URL / HTML
# -------------------------------------------------------------------
def is_valid_url(url: str) -> bool:
    domain = urlparse(url).netloc.lower()
    if domain in ("reddit.com", "www.reddit.com", "old.reddit.com", "redd.it", "i.redd.it"):
        return False
    if url.lower().endswith((".jpg", ".png", ".gif", ".jpeg", ".webp", ".mp4")):
        return False
    return True

def fetch_html(url: str) -> str:
    _rate_limit_host(url)
    try:
        r = session.get(url, timeout=HTML_TIMEOUT, allow_redirects=True)
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
        logger.debug(f"[REDDIT] Requesting: {url}")
        r = session.get(url, timeout=REQUEST_TIMEOUT)
        if not r.ok:
            logger.warning(f"[REDDIT] Failed /r/{sub} | status={r.status_code} | response={r.text[:200]}")
            return []
        data = r.json()
        posts = [c["data"] for c in data.get("data", {}).get("children", [])]
        logger.info(f"[REDDIT] /r/{sub} API returned {len(posts)} posts")
        return posts
    except Exception as e:
        logger.exception(f"[REDDIT] Fetch failed /r/{sub} | {e}")
        return []

# -------------------------------------------------------------------
# POST PROCESSOR
# -------------------------------------------------------------------
def process_post(post: dict) -> Optional[Dict]:
    try:
        url = post.get("url")
        if not url:
            logger.debug(f"[REDDIT] Post missing URL: {post.get('id', 'unknown')}")
            return None
            
        if not is_valid_url(url):
            logger.debug(f"[REDDIT] URL not valid (reddit domain): {url}")
            return None

        url = normalize_url(url)
        url_hash = sha1(url)
        if url_exists(url_hash):
            logger.debug(f"[REDDIT] Duplicate URL: {url}")
            return None

        html = fetch_html(url)
        if not html:
            logger.debug(f"[REDDIT] Failed to fetch HTML: {url}")
            return None

        text = article_utils.extract_article_text(html)
        if not text:
            logger.debug(f"[REDDIT] Text too short or extraction failed: {url}")
            return None
            
        if not article_utils.has_security_context(text):
            logger.debug(f"[REDDIT] No security context in text: {url}")
            return None

        title = article_utils.extract_title(html) or post.get("title", "")
        cves = article_utils.extract_cves(text)

        nested = extract_nested_links_inline(html, url)

        incident_key = (
            "CVE::" + ",".join(sorted(cves))
            if cves else
            "TEXT::" + sha1((title + text[:2000]).lower())
        )

        if incident_exists(incident_key):
            logger.debug(f"[REDDIT] Duplicate incident: {incident_key}")
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
            "nested_links": nested,     # <-- correct nested objects
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
        posts = fetch_subreddit(sub)
        logger.info(f"[REDDIT] /r/{sub} returned {len(posts)} posts")
        jobs.extend(posts)
        time.sleep(0.5)

    logger.info(f"[REDDIT] Total posts collected: {len(jobs)}")
    
    if not jobs:
        logger.warning("[REDDIT] No posts collected from any subreddit. Check if subreddits are accessible.")
        return

    articles: List[Dict] = []
    skipped_count = 0
    duplicate_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as exe:
        futures = [exe.submit(process_post, p) for p in jobs]
        for f in as_completed(futures):
            try:
                res = f.result()
                if res:
                    articles.append(res)
                else:
                    skipped_count += 1
            except Exception as e:
                logger.warning(f"[REDDIT] Worker error | {e}")
                skipped_count += 1

    logger.info(f"[REDDIT] Processed: {len(articles)} articles, {skipped_count} skipped/duplicates")
    
    if not articles:
        logger.info("[REDDIT] No new incidents (all posts were duplicates or filtered)")
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
        logger.error(f"[REDDIT][BULK] failures={len(errors)} (showing up to 3)")
        for item in errors[:3]:
            logger.error(f"[REDDIT][BULK][FAIL] {item}")

    logger.info(f"[REDDIT][DONE] New incidents indexed: {success}")

if __name__ == "__main__":
    main()