#!/usr/bin/env python3
"""
SOC Recommendation & Patch Enrichment Engine (Dynamic-Only)

• ALL recommendations fetched dynamically from online sources
• NO static / hardcoded SOC playbooks
• Sentence-complete extraction
• Semantic deduplication
• NO LLM usage
• Safe for automated pipelines
"""

import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import List, Dict, Optional
from googlesearch import search


# ============================================================
# CONSTANTS
# ============================================================

PATCH_VERBS = {
    "fixed in", "patched in", "upgrade to", "update to",
    "apply patch", "security update", "hotfix",
    "interim fix", "resolved in", "workaround"
}

RECOMMENDATION_VERBS = {
    "should", "must", "are advised", "are urged",
    "recommended", "recommend", "disable",
    "restrict", "apply", "configure", "mitigate",
    "remove", "block", "rotate", "monitor",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

STOP_WORDS = {
    "the", "a", "an", "in", "is", "on", "of", "for", "to",
    "and", "with", "by", "vulnerability", "issue", "flaw",
    "summary", "detected"
}

SKIP_DOMAINS = (
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "youtube.com",
    "reddit.com",
    "medium.com",
    "github.com",  # avoid PoC noise
    "nvd.nist.gov",
    "cve.mitre.org",
)


# ============================================================
# CORE ENGINE
# ============================================================

class RecommendationEngine:
    """
    Dynamic SOC-grade enrichment engine.

    Returns ONLY externally sourced recommendations.
    """

    # --------------------------------------------------------
    # PUBLIC ENTRY
    # --------------------------------------------------------
    def get_recommendations(self, advisory_summary: str) -> Dict[str, Optional[List[str]]]:
        recommendations: List[str] = []
        patch_details: List[str] = []

        query = self._build_query(advisory_summary)

        try:
            results = search(
                query,
                num_results=8,
                advanced=True
            )

            for r in results:
                url = r.url
                if self._skip_url(url):
                    continue

                patches, recs = self._scrape_url(url)
                patch_details.extend(patches)
                recommendations.extend(recs)

        except Exception:
            pass  # Never break SOC pipeline

        # Semantic dedup
        recommendations = self._dedup_semantic(recommendations)
        patch_details = self._dedup_semantic(patch_details)

        return {
            "recommendations": recommendations[:6] or None,
            "patch_details": patch_details[:5] or None,
        }

    # ========================================================
    # SCRAPING
    # ========================================================

    def _scrape_url(self, url: str) -> tuple[List[str], List[str]]:
        patches: List[str] = []
        recs: List[str] = []

        try:
            resp = requests.get(url, headers=HEADERS, timeout=8)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()

            text = soup.get_text(" ", strip=True)
            text = re.sub(r"\s+", " ", text)

            sentences = re.split(r"(?<=[.!?])\s+", text)
            domain = urlparse(url).netloc

            for s in sentences:
                s_clean = s.strip()
                s_lower = s_clean.lower()

                # ---------------- PATCH EXTRACTION ----------------
                if any(v in s_lower for v in PATCH_VERBS):
                    if 40 <= len(s_clean) <= 350:
                        patches.append(f"{s_clean} (Source: {domain})")
                        continue

                # ------------- RECOMMENDATION EXTRACTION ----------
                if any(v in s_lower for v in RECOMMENDATION_VERBS):
                    if 40 <= len(s_clean) <= 260:
                        recs.append(f"{s_clean} (Source: {domain})")

        except Exception:
            pass

        return patches, recs

    # ========================================================
    # QUERY GENERATION
    # ========================================================

    def _build_query(self, text: str) -> str:
        cve = self._extract_cve(text)
        if cve:
            return f"{cve} mitigation remediation guidance"

        keywords = self._extract_keywords(text)
        return f"{keywords} security mitigation remediation"

    # ========================================================
    # EXTRACTION HELPERS
    # ========================================================

    def _extract_cve(self, text: str) -> Optional[str]:
        m = re.search(r"\bCVE-\d{4}-\d{4,7}\b", text or "", re.I)
        return m.group(0).upper() if m else None

    def _extract_keywords(self, text: str) -> str:
        words = re.findall(r"[a-zA-Z0-9]+", (text or "").lower())
        keywords = [w for w in words if w not in STOP_WORDS and len(w) > 3]
        return " ".join(keywords[:6])

    def _skip_url(self, url: str) -> bool:
        return any(bad in url for bad in SKIP_DOMAINS)

    # ========================================================
    # SEMANTIC DEDUP
    # ========================================================

    def _normalize(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"\(source:.*?\)", "", text)
        text = re.sub(r"[^a-z0-9 ]+", "", text)
        return re.sub(r"\s+", " ", text).strip()

    def _dedup_semantic(self, items: List[str]) -> List[str]:
        seen = set()
        out = []

        for item in items:
            if not item:
                continue

            norm = self._normalize(item)
            if norm in seen:
                continue

            seen.add(norm)
            out.append(item)

        return out


# ============================================================
# MODULE-LEVEL WRAPPER
# ============================================================

def get_recommendations(advisory_summary: str) -> Dict[str, Optional[List[str]]]:
    engine = RecommendationEngine()
    return engine.get_recommendations(advisory_summary)
