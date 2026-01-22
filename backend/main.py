#!/usr/bin/env python3

import os
import sys
import time
import json
import datetime
from typing import Set

from utils.common import (
    logger,
    read_yaml,
    ensure_dir,
    sanitize_filename,
)

from collectors.feeds import fetch_rss
from collectors.page import fetch_page_text
from collectors.mitre import map_to_tactics
from enrichment.cvss import fetch_cvss
from llm.opensummarize import summarize_item
from renderer.render import render_html
from enrichment.recommender import get_recommendations
from llm.mbc import extract_mbc


# ============================================================
# CONSTANTS
# ============================================================

SEEN_FILE = "seen_ids.json"


# ============================================================
# PERSISTENT DEDUP HELPERS
# ============================================================

def load_seen_ids(path: str) -> Set[str]:
    if not os.path.exists(path):
        return set()

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return set(data)
    except Exception as e:
        logger.warning(f"[DEDUP] Failed to load seen file: {e}")

    return set()


def save_seen_ids(path: str, seen: Set[str]) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(sorted(seen), f, indent=2)
    os.replace(tmp, path)


# ============================================================
# HELPERS
# ============================================================

def advisory_id(prefix: str, idx: int) -> str:
    ts = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M")
    return f"{prefix}-{ts}-{idx:02d}"


# ============================================================
# MAIN PIPELINE
# ============================================================

def main():
    # --------------------------------------------------------
    # Load configuration
    # --------------------------------------------------------
    cfg = read_yaml("config.yaml")

    workspace = cfg.get("workspace", "./workspace")
    ensure_dir(workspace)

    seen_path = os.path.join(workspace, SEEN_FILE)
    seen_ids = load_seen_ids(seen_path)

    logger.info(f"[DEDUP] Loaded {len(seen_ids)} previously processed items")

    report_cfg = cfg.get("report", {})
    advisory_prefix = report_cfg.get("advisory_id_prefix", "SOC-TA")
    tlp_default = report_cfg.get("tlp", "AMBER")
    max_items = report_cfg.get("max_advisories_per_run", 3)

    # --------------------------------------------------------
    # Load RSS sources
    # --------------------------------------------------------
    rss_urls = cfg.get("sources", {}).get("rss", [])
    if not rss_urls:
        logger.error("❌ No RSS sources configured in config.yaml")
        sys.exit(1)

    logger.info(f"[STEP] Fetching feeds from {len(rss_urls)} sources")

    items = fetch_rss(
        urls=rss_urls,
        seen_ids=seen_ids,  # 🔴 CRITICAL: persistent dedup
        per_feed=8,
        days_back=20,
    )

    if not items:
        logger.info("⚠️ No new high-signal threat articles")
        sys.exit(0)

    logger.info(f"[PIPELINE] Max advisories this run: {max_items}")

    generated = []
    processed_this_run = set()

    # --------------------------------------------------------
    # PROCESS ITEMS
    # --------------------------------------------------------
    idx = 0
    for item in items:
        if len(generated) >= max_items:
            break

        item_id = item.get("id")
        if not item_id:
            continue

        # Extra safety (race / partial write protection)
        if item_id in seen_ids or item_id in processed_this_run:
            continue

        idx += 1
        title = item.get("title", "Unknown")
        logger.info(f"[{len(generated)+1}/{max_items}] {title[:80]}")

        # ----------------------------------------------------
        # Fetch full article content
        # ----------------------------------------------------
        try:
            source_text = fetch_page_text(
                item["link"],
                max_chars=20000,
            )

            if not source_text or len(source_text) < 500:
                raise RuntimeError("Fetched content too short")

        except Exception as e:
            logger.warning(f"[PAGE] Fetch failed: {e}")
            continue

        # ----------------------------------------------------
        # LLM ANALYSIS
        # ----------------------------------------------------
        try:
            advisory = summarize_item(item, source_text)
        except Exception as e:
            logger.error(f"❌ LLM summarization failed: {e}")
            continue

        # ----------------------------------------------------
        # RECOMMENDATION ENRICHMENT
        # ----------------------------------------------------
        try:
            query_text = advisory.get("exec_summary", "")
            if len(query_text) < 50:
                query_text = advisory.get("title", "")

            rec_data = get_recommendations(query_text)

            if rec_data:
                advisory["recommendations"] = (
                    rec_data.get("recommendations")
                    or advisory.get("recommendations", [])
                )
                advisory["patch_details"] = (
                    rec_data.get("patch_details")
                    or advisory.get("patch_details")
                )
            if "recommendations" not in advisory and "patch_details" not in advisory:
                advisory.pop("recommendations", None)
                advisory.pop("patch_details", None)


        except Exception:
            logger.error("[Recs] Recommendation lookup failed", exc_info=True)
            advisory["recommendations"] = [
                "Monitor logs for suspicious activity.",
                "Apply compensating controls until patched.",
            ]

        # ----------------------------------------------------
        # MITRE ATT&CK MAPPING
        # ----------------------------------------------------
        mitre = map_to_tactics(
            advisory.get("attack_keywords", []),
            " ".join([
                advisory.get("title", ""),
                advisory.get("exec_summary", ""),
                item.get("summary", ""),
            ]),
        )
        # ----------------------------------------------------
        # MBC (Malware Behavior Catalog)
        # ----------------------------------------------------
        mbc = extract_mbc(
            title=advisory.get("title", ""),
            threat_type=advisory.get("threat_type", ""),
            exec_summary=advisory.get("exec_summary", ""),
            mitre=mitre,
        )


        exec_summary_parts = [
            p.strip()
            for p in advisory.get("exec_summary", "").split("\n\n")
            if p.strip()
        ]
       # ----------------------------------------------------
        # CVSS ENRICHMENT (AUTHORITATIVE – HIGHEST WINS)
        # ----------------------------------------------------
        cvss_results = {}
        highest_cvss = None

        for cve in advisory.get("cves", []):
            cvss = fetch_cvss(cve)
            if not cvss:
                continue

            cvss_results[cve] = cvss

            if (
                highest_cvss is None
                or cvss["score"] > highest_cvss["score"]
            ):
                highest_cvss = cvss

        # ----------------------------------------------------
        # FINAL CRITICALITY (SOC RULE)
        # ----------------------------------------------------
        if highest_cvss:
            final_criticality = highest_cvss["criticality"]
        else:
            # ❗ No CVSS → cap severity
            final_criticality = advisory.get("criticality", "MEDIUM")
            if final_criticality in ("HIGH", "CRITICAL"):
                logger.info("[SEVERITY] No CVE found, downgrading criticality to MEDIUM")
                final_criticality = "MEDIUM"

        # ----------------------------------------------------
        # FINAL CONTEXT
        # ----------------------------------------------------
        advisory_uid = advisory_id(advisory_prefix, len(generated) + 1)

        context = {
            "advisory_id": advisory_uid,
            "title": advisory.get("title", "Threat Advisory"),
            "criticality": final_criticality or advisory.get("criticality"),
            "threat_type": advisory.get("threat_type", "Vulnerability"),
            "exec_summary_parts": exec_summary_parts,
            "affected_product": advisory.get("affected_product", "Not specified"),
            "vendor": advisory.get("vendor", "Unknown"),
            "cves": advisory.get("cves", []),
            "cvss": cvss_results,
            "sectors": advisory.get("sectors", ["General"]),
            "regions": advisory.get("regions", ["Global"]),
            "recommendations": advisory.get("recommendations", []),
            "patch_details": advisory.get("patch_details"),
            "references": [item.get("link")],
            "tlp": advisory.get("tlp", tlp_default),
            "mitre": mitre,
            "mbc": mbc,
            "published": item.get("published", ""),
            "source": item.get("source", ""),
        }

        # ----------------------------------------------------
        # RENDER HTML
        # ----------------------------------------------------
        out_html = os.path.join(
            workspace,
            f"{sanitize_filename(advisory_uid)}.html",
        )

        try:
            render_html("templates", context, out_html)
            generated.append(out_html)

            # 🔒 Mark as seen ONLY after success
            seen_ids.add(item_id)
            processed_this_run.add(item_id)
            save_seen_ids(seen_path, seen_ids)

            logger.info(f"Generated {advisory_uid}")

        except Exception:
            logger.error("❌ HTML rendering failed", exc_info=True)
            continue

    # --------------------------------------------------------
    # FINAL SUMMARY
    # --------------------------------------------------------
    print("\n" + "=" * 80)
    print(f"PIPELINE COMPLETE | Generated {len(generated)} advisories")
    print("=" * 80)

    for i, path in enumerate(generated, 1):
        print(f"{i:02d}. {os.path.basename(path)}")

    print("=" * 80)
    sys.exit(0 if generated else 1)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()