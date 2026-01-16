import requests
import feedparser
import re
from typing import List, Dict, Set
from bs4 import BeautifulSoup
from dateutil import parser as dateparser
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

from utils.common import logger, sha1, find_cves


# ============================================================
# CONFIG
# ============================================================

RSS_TIMEOUT = 12
MAX_SUMMARY_LEN = 1200
MAX_WORKERS = 8

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


# ============================================================
# KEYWORDS (CONTENT-BASED TRIAGE)
# ============================================================

# 🚫 HARD DROP — never allowed
HARD_NEGATIVE_KEYWORDS = {
    "best practice", "best practices",
    "how to", "guide", "tutorial",
    "training", "course", "certification",
    "career", "jobs", "salary", "resume",
    "webinar", "conference", "summit",
    "press release", "product launch",
    "new feature", "feature update",
    "marketing", "announcement",
    "whitepaper", "ebook", "brochure",
}

# ⚠️ SOFT NEGATIVE — allowed but penalized
SOFT_NEGATIVE_KEYWORDS = {
    "opinion", "thought leadership",
    "forecast", "prediction", "outlook",
    "trends", "case study", "customer story",
}

# 🔥 STRONG POSITIVE — high priority
STRONG_POSITIVE_KEYWORDS = {
    "cve", "zero-day", "0day",
    "exploited in the wild",
    "remote code execution", "rce",
    "authentication bypass",
    "privilege escalation",
    "arbitrary code execution",
    "patch released", "fixed in",
    "security update", "hotfix",
    "proof of concept", "poc",
    "exploit available",
}

# ➕ WEAK POSITIVE — still valuable
WEAK_POSITIVE_KEYWORDS = {
    "malware", "ransomware", "trojan",
    "botnet", "backdoor", "loader",
    "dropper", "campaign", "apt",
    "threat actor", "intrusion",
    "breach", "compromise",
}


# ============================================================
# HELPERS
# ============================================================

def normalize_datetime(dt):
    if not dt:
        return None
    if dt.tzinfo:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def parse_date(raw: str):
    try:
        return normalize_datetime(dateparser.parse(raw))
    except Exception:
        return None


def normalize_url(url: str) -> str:
    try:
        p = urlparse(url)
        q = [
            (k, v)
            for k, v in parse_qsl(p.query, keep_blank_values=True)
            if k.lower() not in TRACKING_PARAMS
        ]
        return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(q), ""))
    except Exception:
        return url


def clean_html(text: str) -> str:
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    cleaned = soup.get_text(" ", strip=True)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned[:MAX_SUMMARY_LEN]


def is_recent(dt: datetime, days: int) -> bool:
    if not dt:
        return False
    return dt >= (datetime.utcnow() - timedelta(days=days))


# ============================================================
# CONTENT SCORING (THIS IS THE FIX)
# ============================================================

def score_item(blob: str, cves: List[str]) -> int:
    """
    Score content quality.
    Higher = more important to show to client.
    """
    score = 0

    # 🚫 Hard drop
    for kw in HARD_NEGATIVE_KEYWORDS:
        if kw in blob:
            return -999

    # 🔥 CVE = instant boost
    if cves:
        score += 100

    # 🔥 Strong signals
    for kw in STRONG_POSITIVE_KEYWORDS:
        if kw in blob:
            score += 30

    # ➕ Weak signals
    for kw in WEAK_POSITIVE_KEYWORDS:
        if kw in blob:
            score += 15

    # ⚠️ Soft negatives
    for kw in SOFT_NEGATIVE_KEYWORDS:
        if kw in blob:
            score -= 20

    return score


# ============================================================
# DEDUP HASH
# ============================================================

def build_item_id(title: str, summary: str, cves: List[str]) -> str:
    if cves:
        key = "cve|" + "|".join(sorted(cves))
    else:
        blob = f"{title} {summary}".lower()
        blob = re.sub(r"[^a-z0-9\s]", " ", blob)
        blob = re.sub(r"\s+", " ", blob).strip()
        key = "topic|" + blob[:500]

    return sha1(key)


# ============================================================
# FETCH SINGLE FEED
# ============================================================

def _fetch_feed(
    url: str,
    seen_ids: Set[str],
    per_feed: int,
    days_back: int
) -> List[Dict]:

    items: List[Dict] = []

    try:
        logger.info(f"[RSS] Fetching {url}")
        r = requests.get(url, headers=HEADERS, timeout=RSS_TIMEOUT)
        r.raise_for_status()

        parsed = feedparser.parse(r.content)

        for entry in parsed.entries[:per_feed]:
            title = getattr(entry, "title", "").strip()
            link = getattr(entry, "link", "").strip()

            if not title or not link:
                continue

            published_raw = getattr(entry, "published", getattr(entry, "updated", ""))
            published_dt = parse_date(published_raw)

            if not is_recent(published_dt, days_back):
                continue

            summary = clean_html(getattr(entry, "summary", ""))
            canonical_link = normalize_url(link)

            blob = f"{title} {summary}".lower()
            cves = find_cves(f"{blob} {canonical_link}")

            score = score_item(blob, cves)
            if score < 0:
                continue

            item_id = build_item_id(title, summary, cves)
            if item_id in seen_ids:
                continue

            items.append({
                "id": item_id,
                "source": url,
                "title": title[:200],
                "summary": summary,
                "link": canonical_link,
                "published": published_raw,
                "published_dt": published_dt,
                "cves": cves,
                "score": score,
            })

    except Exception as e:
        logger.warning(f"[RSS] Failed {url}: {e}")

    return items


# ============================================================
# PUBLIC API
# ============================================================

def fetch_rss(
    urls: List[str],
    seen_ids: Set[str],
    per_feed: int = 15,
    days_back: int = 20,
) -> List[Dict]:

    collected: List[Dict] = []
    workers = min(MAX_WORKERS, len(urls))

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [
            executor.submit(_fetch_feed, url, seen_ids, per_feed, days_back)
            for url in urls
        ]

        for future in as_completed(futures):
            try:
                collected.extend(future.result())
            except Exception as e:
                logger.warning(f"[RSS] Worker error: {e}")

    # 🔥 MOST IMPORTANT CHANGE
    collected.sort(
        key=lambda x: (
            x.get("score", 0),
            x.get("published_dt") or datetime.min,
        ),
        reverse=True,
    )

    logger.info(f"[RSS] Collected {len(collected)} prioritized CTI articles")
    return collected