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
# KEYWORD FILTERING (AUTHORITATIVE)
# ============================================================

POSITIVE_KEYWORDS = {
    # Vulnerabilities / exploits
    "vulnerability", "security flaw", "weakness",
    "exploit", "exploitation", "zero-day", "0day", "n-day",
    "patch", "hotfix", "mitigation", "workaround", "update",

    # Malware
    "malware", "ransomware", "trojan", "worm", "spyware",
    "backdoor", "botnet", "loader", "dropper",

    # Incidents
    "breach", "data breach", "intrusion", "compromise",
    "incident", "attack", "campaign", "apt",

    # Web / app
    "rce", "remote code execution", "sql injection",
    "command injection", "xss", "csrf", "ssrf",
    "path traversal", "deserialization",

    # Auth / identity
    "authentication", "authorization", "oauth",
    "sso", "jwt", "session fixation",

    # Cloud / infra
    "kubernetes", "docker", "container escape",
    "cloud misconfiguration", "iam", "privilege",

    # Supply chain
    "supply chain", "dependency", "third-party",
}

NEGATIVE_KEYWORDS = {
    # Opinion / prediction
    "prediction", "forecast", "outlook", "trends",
    "opinion", "thought leadership", "stories", "productreview"

    # Education fluff
    "best practice", "best practices",
    "guide", "tutorial", "how to",
    "tips", "checklist", "cheat sheet",
    "training", "course", "certification", "features", "touchscreen",

    # Career / HR
    "career", "jobs", "salary", "interview",
    "resume", "skills", "skill", "hiring",

    # Events / marketing
    "webinar", "workshop", "conference", "summit",
    "podcast", "livestream",

    # Vendor marketing
    "press release", "product launch",
    "new feature", "feature update",
    "announcement", "roadmap",
    "award", "ranking", "leader",
    "gartner", "forrester",

    # Business fluff
    "case study", "customer story",
    "success story", "whitepaper",
    "ebook", "brochure",

    # Non-security tech
    "performance improvement",
    "scalability", "latency",
    "architecture overview",
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
# FILTERING LOGIC (SIMPLE + CORRECT)
# ============================================================

def passes_keyword_filter(blob: str, cves: List[str]) -> bool:
    """
    Decision table:
    - NEGATIVE keyword → DROP
    - CVE present → ACCEPT
    - POSITIVE keyword → ACCEPT
    - Else → DROP
    """

    if any(k in blob for k in NEGATIVE_KEYWORDS):
        return False

    if cves:
        return True

    return any(k in blob for k in POSITIVE_KEYWORDS)


# ============================================================
# 🔑 SINGLE TOPIC-LEVEL DEDUP HASH
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

            if not passes_keyword_filter(blob, cves):
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

    collected.sort(
        key=lambda x: x.get("published_dt") or datetime.min,
        reverse=True,
    )

    logger.info(f"[RSS] Collected {len(collected)} high-signal CTI articles")
    return collected