#!/usr/bin/env python3
"""
SOC Recommendation & Patch Enrichment Engine (STRICT, SOURCE-DRIVEN)

✔ Advisory-specific recommendations
✔ No generic boilerplate
✔ No LLM
✔ Full paragraph extraction
✔ CVE-aware + non-CVE patch detection
✔ NEVER returns empty dict
"""

import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import List, Dict, Optional
from googlesearch import search
from llm.recommender_refiner import refine_blocks

# ============================================================
# CONFIG
# ============================================================

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

TIMEOUT = 8
MAX_RESULTS = 8

SKIP_DOMAINS = (
    "facebook.com", "twitter.com", "linkedin.com",
    "youtube.com", "reddit.com", "medium.com",
    "github.com", "nvd.nist.gov", "cve.mitre.org",
)

PATCH_ANCHORS = (
    "patched", "fixed in", "upgrade to", "update to",
    "security update", "hotfix", "resolved in",
)

MITIGATION_ANCHORS = (
    "mitigation", "workaround", "remediation",
    "defenders should", "organizations should",
    "recommended to", "can reduce risk",
)

SECTION_STOP = re.compile(
    r"^(references|impact|technical|ioc|indicators|overview|summary)$",
    re.I,
)

CVE_RE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.I)

# ============================================================
# PUBLIC API
# ============================================================

def get_recommendations(advisory_summary: str) -> Dict[str, List[str]]:
    engine = _Engine()
    return engine.run(advisory_summary)

# ============================================================
# ENGINE
# ============================================================

class _Engine:

    def run(self, text: str) -> Dict[str, List[str]]:
        cve = self._extract_cve(text)
        query = self._build_query(text, cve)

        blocks: List[str] = []

        try:
            for r in search(query, num_results=MAX_RESULTS, advanced=True):
                url = r.url
                if self._skip(url):
                    continue

                blocks.extend(self._extract_blocks(url))

        except Exception:
            return {"recommendations": [], "patch_details": []}

        blocks = self._dedup(blocks)

        if cve:
            patches = refine_blocks(blocks[:5], "patch_details")
            return {"patch_details": patches}

        patches = refine_blocks(blocks[:5], "patch_details")
        if patches:
            return {"patch_details": patches}

        recs = refine_blocks(blocks[:5], "recommendations")
        return {"recommendations": recs}

    # --------------------------------------------------------

    def _build_query(self, text: str, cve: Optional[str]) -> str:
        if cve:
            return f"{cve} remediation mitigation guidance"

        words = re.findall(r"[a-zA-Z]{4,}", text.lower())
        keywords = " ".join(words[:6])
        return f"{keywords} security mitigation recommendation"

    # --------------------------------------------------------

    def _extract_blocks(self, url: str) -> List[str]:
        out: List[str] = []

        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            r.raise_for_status()
        except Exception:
            return out

        soup = BeautifulSoup(r.text, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        domain = urlparse(url).netloc

        for el in soup.find_all(["p", "li"]):
            text = el.get_text(" ", strip=True)
            low = text.lower()

            if len(text) < 60:
                continue

            if any(a in low for a in PATCH_ANCHORS + MITIGATION_ANCHORS):
                block = [text]

                for sib in el.find_next_siblings():
                    sib_text = sib.get_text(" ", strip=True)
                    if not sib_text:
                        continue

                    if SECTION_STOP.match(sib_text.lower()):
                        break

                    if len(sib_text) <= 200:
                        block.append(sib_text)
                        continue

                    break

                merged = " ".join(block)
                merged = re.sub(r"\s+", " ", merged).strip()

                if len(merged) >= 80:
                    out.append(f"{merged} (Source: {domain})")

        return out

    # --------------------------------------------------------

    def _extract_cve(self, text: str) -> Optional[str]:
        m = CVE_RE.search(text or "")
        return m.group(0).upper() if m else None

    def _skip(self, url: str) -> bool:
        return any(b in url for b in SKIP_DOMAINS)

    def _dedup(self, items: List[str]) -> List[str]:
        seen = set()
        out = []

        for i in items:
            norm = re.sub(r"\(Source:.*?\)", "", i).lower()
            norm = re.sub(r"[^a-z0-9 ]+", "", norm)
            norm = re.sub(r"\s+", " ", norm).strip()

            if norm in seen:
                continue

            seen.add(norm)
            out.append(i)

        return out
    