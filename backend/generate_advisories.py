#!/usr/bin/env python3
# -- coding: utf-8 --

"""
SOC Advisory API Runner (FINAL)
--------------------------------
• Frontend-triggered
• JSON-first (HTML is just a view)
• CVSS-authoritative severity
• MITRE + MBC + Recommendations
• SOC-compliant & production-safe
"""

import os
import sys
import json
import datetime
from typing import Dict, List, Set

# ------------------------------------------------------------
# WINDOWS UTF-8 SAFETY
# ------------------------------------------------------------
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ------------------------------------------------------------
# INTERNAL IMPORTS
# ------------------------------------------------------------
from utils.common import logger, read_yaml, ensure_dir, sanitize_filename

from collectors.feeds import fetch_rss
from collectors.page import fetch_page_text
from collectors.mitre import map_to_tactics

from llm.opensummarize import summarize_item
from llm.mbc import extract_mbc

from enrichment.cvss import fetch_cvss
from enrichment.recommender import get_recommendations

from renderer.render import render_html

# ------------------------------------------------------------
# CONSTANTS
# ------------------------------------------------------------
SEEN_FILE = "seen_ids.json"

# ------------------------------------------------------------
# DEDUP HELPERS
# ------------------------------------------------------------
def load_seen_ids(path: str) -> Set[str]:
    if not os.path.exists(path):
        return set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            return set(json.load(f))
    except Exception:
        return set()

def save_seen_ids(path: str, seen: Set[str]) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(sorted(seen), f, indent=2)
    os.replace(tmp, path)

# ------------------------------------------------------------
# ADVISORY ID
# ------------------------------------------------------------
def generate_advisory_id(prefix: str, idx: int) -> str:
    ts = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M")
    return f"{prefix}-{ts}-{idx:02d}"

# ------------------------------------------------------------
# MAIN RUNNER
# ------------------------------------------------------------
def run(max_advisories: int = 3) -> None:
    cfg = read_yaml("config.yaml")

    workspace = cfg.get("workspace", "./workspace")
    ensure_dir(workspace)

    report_cfg = cfg.get("report", {})
    advisory_prefix = report_cfg.get("advisory_id_prefix", "SOC-TA")
    tlp_default = report_cfg.get("tlp", "AMBER")

    seen_path = os.path.join(workspace, SEEN_FILE)
    seen_ids = load_seen_ids(seen_path)

    rss_urls = cfg.get("sources", {}).get("rss", [])
    if not rss_urls:
        print(json.dumps({"error": "no_rss_sources"}))
        sys.exit(1)

    # --------------------------------------------------------
    # FETCH ARTICLES
    # --------------------------------------------------------
    items = fetch_rss(
        urls=rss_urls,
        seen_ids=seen_ids,
        per_feed=10,
        days_back=14,
    )

    if not items:
        print(json.dumps({"generated": []}))
        sys.exit(0)

    results: List[Dict] = []
    processed_this_run = set()
    idx = 0

    # --------------------------------------------------------
    # PROCESS ITEMS
    # --------------------------------------------------------
    for item in items:
        if len(results) >= max_advisories:
            break

        item_id = item.get("id")
        if not item_id or item_id in seen_ids or item_id in processed_this_run:
            continue

        idx += 1

        # ----------------------------------------------------
        # FETCH ARTICLE CONTENT
        # ----------------------------------------------------
        try:
            text = fetch_page_text(item["link"], max_chars=25000)
            if not text or len(text) < 500:
                continue
        except Exception:
            continue

        # ----------------------------------------------------
        # LLM ANALYSIS
        # ----------------------------------------------------
        try:
            advisory = summarize_item(item, text)
        except Exception:
            continue

        # ----------------------------------------------------
        # MITRE ATT&CK
        # ----------------------------------------------------
        mitre = map_to_tactics(
            advisory.get("attack_keywords", []),
            f"{advisory.get('title','')} {advisory.get('exec_summary','')}",
        )

        # ----------------------------------------------------
        # MBC (KEYWORD-ONLY CALL)
        # ----------------------------------------------------
        mbc = extract_mbc(
            title=advisory.get("title", ""),
            threat_type=advisory.get("threat_type", ""),
            exec_summary=advisory.get("exec_summary", ""),
            mitre=mitre,
        )

        # ----------------------------------------------------
        # CVSS (AUTHORITATIVE)
        # ----------------------------------------------------
        cvss_data = {}
        highest_cvss = None

        for cve in advisory.get("cves", []):
            cvss = fetch_cvss(cve)
            if not cvss:
                continue
            cvss_data[cve] = cvss
            if highest_cvss is None or cvss["score"] > highest_cvss["score"]:
                highest_cvss = cvss

        # ----------------------------------------------------
        # FINAL CRITICALITY (SOC RULE)
        # ----------------------------------------------------
        if highest_cvss:
            final_criticality = highest_cvss["criticality"]
        else:
            final_criticality = advisory.get("criticality", "MEDIUM")
            if final_criticality in ("HIGH", "CRITICAL"):
                final_criticality = "MEDIUM"

        # ----------------------------------------------------
        # RECOMMENDATIONS
        # ----------------------------------------------------
        try:
            rec = get_recommendations(advisory.get("exec_summary", ""))
            if rec:
                advisory["recommendations"] = rec.get("recommendations", [])
                advisory["patch_details"] = rec.get("patch_details")
        except Exception:
            pass

        # ----------------------------------------------------
        # FINAL CONTEXT (SOURCE OF TRUTH)
        # ----------------------------------------------------
        advisory_id = generate_advisory_id(advisory_prefix, idx)

        exec_summary = advisory.get("exec_summary", "").strip()

        exec_summary_parts = [
            p.strip()
            for p in exec_summary.split("\n\n")
            if p.strip()
        ]

        context = {
            # Identity
            "advisory_id": advisory_id,
            "title": advisory.get("title"),
            "full_title": item.get("title"),
            "published": item.get("published"),

            # Classification
            "criticality": final_criticality,
            "threat_type": advisory.get("threat_type"),
            "tlp": advisory.get("tlp", tlp_default),

            # Executive Summary (🔥 THIS IS THE FIX)
            "exec_summary": exec_summary,                 # raw text (API, DB)
            "exec_summary_parts": exec_summary_parts,     # UI / HTML

            # Business impact
            "affected_product": advisory.get("affected_product"),
            "vendor": advisory.get("vendor"),
            "sectors": advisory.get("sectors", ["General"]),
            "regions": advisory.get("regions", ["Global"]),

            # Intelligence
            "cves": advisory.get("cves", []),
            "cvss": cvss_data,
            "mitre": mitre,
            "mbc": mbc,

            # Response
            "recommendations": advisory.get("recommendations", []),
            "patch_details": advisory.get("patch_details"),

            # References
            "references": [item.get("link")] if item.get("link") else [],
        }


        # ----------------------------------------------------
        # RENDER HTML
        # ----------------------------------------------------
        html_path = os.path.join(
            workspace,
            f"{sanitize_filename(advisory_id)}.html",
        )

        try:
            render_html("templates", context, html_path)

            # ------------------------------------------------
            # JSON RESPONSE OBJECT (FRONTEND)
            # ------------------------------------------------
            results.append({
                **context,
                "html_path": os.path.abspath(html_path),
            })

            seen_ids.add(item_id)
            processed_this_run.add(item_id)
            save_seen_ids(seen_path, seen_ids)

        except Exception:
            continue

    # --------------------------------------------------------
    # FINAL JSON OUTPUT (API CONTRACT)
    # --------------------------------------------------------
    print(json.dumps({"generated": results}, ensure_ascii=True))


# ------------------------------------------------------------
# ENTRY POINT
# ------------------------------------------------------------
if __name__ == "__main__":
    max_items = 3
    if len(sys.argv) > 1:
        try:
            max_items = int(sys.argv[1])
        except Exception:
            pass

    run(max_items)