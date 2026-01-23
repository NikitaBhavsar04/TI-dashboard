#!/usr/bin/env python3
"""
MANUAL ADVISORY GENERATION PIPELINE (SOC-grade)
- Triggered by frontend (single raw article)
- Reads from OpenSearch raw-articles
- Writes to OpenSearch generated-advisories
"""

import datetime
from typing import Dict, List
import os

from utils.opensearch_client import get_opensearch_client

from utils.common import logger, read_yaml
from collectors.page import fetch_page_text
from collectors.mitre import map_to_tactics
from enrichment.cvss import fetch_cvss
from enrichment.recommender import get_recommendations
from enrichment.ioc import extract_iocs
from llm.opensummarize import summarize_item
from llm.mbc import extract_mbc

# ============================================================
# CONFIG
# ============================================================

cfg = read_yaml("config.yaml")


RAW_INDEX = os.getenv("OPENSEARCH_RAW_INDEX", cfg.get("opensearch", {}).get("raw_index", "ti-raw-articles"))
ADV_INDEX = os.getenv("OPENSEARCH_ADVISORY_INDEX", cfg.get("opensearch", {}).get("advisory_index", "ti-generated-advisories"))

report_cfg = cfg.get("report", {})
ADVISORY_PREFIX = report_cfg.get("advisory_id_prefix", "SOC-TA")
TLP_DEFAULT = report_cfg.get("tlp", "AMBER")

# ============================================================
# OPENSEARCH CLIENT
# ============================================================
os_client = get_opensearch_client()

# ============================================================
# HELPERS
# ============================================================

def advisory_id(prefix: str) -> str:
    ts = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    return f"{prefix}-{ts}"

def load_raw_article(article_id: str) -> Dict:
    r = os_client.search(
        index=RAW_INDEX,
        body={"size": 1, "query": {"term": {"id": article_id}}}
    )

    hits = r.get("hits", {}).get("hits", [])
    if not hits:
        raise KeyError(f"Raw article not found: {article_id}")

    return hits[0]["_source"]

def save_generated_advisory(advisory: dict):
    os_client.index(
        index=ADV_INDEX,
        id=advisory["advisory_id"],
        body=advisory,
        refresh="wait_for",
    )

def normalize_iocs(iocs_raw: dict) -> List[Dict]:
    normalized = []

    if not isinstance(iocs_raw, dict):
        return normalized

    for key, values in iocs_raw.items():
        if not isinstance(values, list):
            continue

        ioc_type = key.rstrip("s")

        for v in values:
            if v:
                normalized.append({
                    "type": ioc_type,
                    "value": v
                })

    return normalized

# ============================================================
# MAIN PIPELINE
# ============================================================

def generate_advisory_for_article(article_id: str) -> dict:
    article = load_raw_article(article_id)
    logger.info(f"[MANUAL] Generating advisory for: {article['title']}")

    # --------------------------------------------------------
    # Article text
    # --------------------------------------------------------
    source_text = article.get("article_text")
    if not source_text or len(source_text) < 500:
        source_text = fetch_page_text(article["article_url"], max_chars=20000)

    if not source_text or len(source_text) < 500:
        raise RuntimeError("Article content too short")

    # --------------------------------------------------------
    # Token safety
    # --------------------------------------------------------
    for n in article.get("nested_links", []):
        if n.get("text"):
            n["text"] = n["text"][:6000]

    # --------------------------------------------------------
    # IOC Extraction
    # --------------------------------------------------------
    iocs_raw = extract_iocs(
        source_text,
        article.get("nested_links", [])
    )
    iocs = normalize_iocs(iocs_raw)

    # --------------------------------------------------------
    # LLM Summary
    # --------------------------------------------------------
    advisory = summarize_item(
        item={
            "title": article["title"],
            "summary": article.get("summary", ""),
            "link": article["article_url"],
            "nested_links": article.get("nested_links", []),
            "cves": article.get("cves", []),
            "source": article.get("source"),
        },
        source_text=source_text,
    )

    exec_summary_parts = [
        p.strip()
        for p in (advisory.get("exec_summary") or "").split("\n\n")
        if p.strip()
    ] or ["Summary not available."]

    # --------------------------------------------------------
    # Recommendations / Patch Details (SAFE, NON-DESTRUCTIVE)
    # --------------------------------------------------------
    try:
        query_text = f"""
        {advisory.get("title","")}
        {advisory.get("exec_summary","")}
        {' '.join(advisory.get("cves", []))}
        """

        rec_data = get_recommendations(query_text)

        if isinstance(rec_data, dict):
            if rec_data.get("recommendations"):
                advisory["recommendations"] = rec_data["recommendations"]

            if rec_data.get("patch_details"):
                advisory["patch_details"] = rec_data["patch_details"]

    except Exception:
        advisory.setdefault("recommendations", [])
        advisory.setdefault("patch_details", [])

    patch_details = advisory.get("patch_details") or []
    if isinstance(patch_details, str):
        patch_details = [patch_details]

    # --------------------------------------------------------
    # MITRE + MBC
    # --------------------------------------------------------
    mitre = map_to_tactics(
        advisory.get("attack_keywords", []),
        f"{advisory.get('title','')} {advisory.get('exec_summary','')}",
    )

    mbc = extract_mbc(
        title=advisory.get("title", ""),
        threat_type=advisory.get("threat_type", ""),
        exec_summary=advisory.get("exec_summary", ""),
        mitre=mitre,
    )

    # -------------------------------------------------------
    # CVSS
    # -------------------------------------------------------
    cvss_entries: List[Dict] = []
    highest = None

    for cve in advisory.get("cves", []):
        cvss = fetch_cvss(cve)
        if not cvss:
            continue

        entry = {
            "cve": cve,
            "score": cvss.get("score"),
            "vector": cvss.get("vector"),
            "criticality": cvss.get("criticality"),
            "source": cvss.get("source"),
        }
        cvss_entries.append(entry)

        if not highest or entry["score"] > highest["score"]:
            highest = entry

    final_criticality = highest["criticality"] if highest else "MEDIUM"

    # --------------------------------------------------------
    # References
    # --------------------------------------------------------
    references = [article["article_url"]]
    for src in iocs_raw.get("sources", []):
        if src not in references:
            references.append(src)

    # --------------------------------------------------------
    # Final Advisory
    # --------------------------------------------------------
    advisory_uid = advisory_id(ADVISORY_PREFIX)

    advisory_doc = {
        "schema_version": "1.0",
        "advisory_id": advisory_uid,

        "article_id": article_id,
        "incident_key": article.get("incident_key"),

        "title": advisory.get("title"),
        "display_title": advisory.get("title"),

        "criticality": final_criticality,
        "threat_type": advisory.get("threat_type"),

        "exec_summary_parts": exec_summary_parts,

        "affected_product": advisory.get("affected_product", "Not specified"),
        "vendor": advisory.get("vendor", "Unknown"),

        "sectors": advisory.get("sectors", []),
        "regions": advisory.get("regions", []),

        "cves": advisory.get("cves", []),
        "cvss": cvss_entries,

        "iocs": iocs,
        "mitre": mitre,
        "mbc": mbc,

        "recommendations": advisory.get("recommendations", []),
        "patch_details": patch_details,

        "references": references,

        "tlp": advisory.get("tlp", TLP_DEFAULT),
        "status": "DRAFT",

        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }

    save_generated_advisory(advisory_doc)
    logger.info(f"✅ Advisory indexed: {advisory_uid}")

    return advisory_doc

# ============================================================
# API WRAPPER
# ============================================================

def generate_advisory(article_id: str) -> dict:
    """
    Wrapper function for API calls.
    Generates and returns an advisory dict for the given article_id.
    """
    return generate_advisory_for_article(article_id)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) != 2:
        print("Usage: manual_advisory.py <raw_article_id>", file=sys.stderr)
        sys.exit(1)

    try:
        advisory_doc = generate_advisory_for_article(sys.argv[1])
        # Output ONLY the advisory JSON to stdout for API consumption
        # All log messages go to stderr via logger
        json_output = json.dumps(advisory_doc, default=str)
        print(json_output)
        sys.stdout.flush()  # Ensure output is sent immediately
    except Exception as e:
        logger.error(f"Failed to generate advisory: {e}")
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)