#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lightweight runner for integration: generates advisories, saves HTML,
and emits a JSON summary to stdout for consumption by external callers.
"""
import os
import sys
import json
from datetime import datetime

# Force UTF-8 encoding for stdout on Windows to handle Unicode characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, will use system env vars

from utils.common import ensure_dir, read_yaml, sanitize_filename, logger

try:
    from collectors.feeds import fetch_rss
    from collectors.cache import load_seen_items, save_seen_items
    from collectors.page import fetch_page_text
    from collectors.mitre import map_to_tactics
    from llm.summarize import summarize_item
    from renderer.render import render_html
except Exception as e:
    # Safely encode error message to avoid Unicode issues
    error_msg = str(e).encode('ascii', errors='replace').decode('ascii')
    print(json.dumps({"error": f"Missing dependency or import error: {error_msg}"}, ensure_ascii=True))
    sys.exit(1)


def run(max_advisories: int = 3):
    cfg = read_yaml("config.yaml")
    workspace = cfg.get("workspace", "./workspace")
    ensure_dir(workspace)

    seen = load_seen_items(workspace)
    rss_urls = cfg.get("sources", {}).get("rss", [])
    if not rss_urls:
        print(json.dumps({"error": "no_rss_sources"}, ensure_ascii=True))
        sys.exit(1)

    items = fetch_rss(rss_urls, seen, per_feed=12)
    if not items:
        print(json.dumps({"error": "no_new_items"}, ensure_ascii=True))
        sys.exit(0)

    items = items[:max_advisories]
    results = []

    for idx, item in enumerate(items, 1):
        title = item.get('title', 'Unknown')
        logger.info(f"[{idx}/{len(items)}] Processing: {title[:80]}")
        
        # Fetch page text
        source_text = ""
        if item.get('link'):
            try:
                source_text = fetch_page_text(item['link'], max_chars=20000)
            except Exception as e:
                logger.warning(f"[PAGE] Failed to fetch {item['link']}: {e}")
                source_text = ""

        if not source_text or len(source_text) < 500:
            logger.warning(f"[SKIP] Content too short for: {title}")
            continue

        # Use summarize_item for LLM analysis
        try:
            context = summarize_item(item, source_text)
        except Exception as e:
            logger.error(f"[LLM] Failed to analyze: {e}")
            continue

        # MITRE ATT&CK mapping
        mitre = map_to_tactics(
            context.get("attack_keywords", []),
            " ".join([
                context.get("title", ""),
                context.get("exec_summary", ""),
                item.get("summary", ""),
            ])
        )

        advisory_id = f"SOC-TA-{datetime.utcnow().strftime('%Y%m%d-%H%M')}-{idx:02d}"
        filename = f"{advisory_id}_{sanitize_filename(context['title'][:60])}.html"
        html_path = os.path.join(workspace, filename)

        # Prepare exec_summary_parts for template
        exec_summary_parts = [
            p.strip()
            for p in context.get("exec_summary", "").split("\n\n")
            if p.strip()
        ]

        final_context = {
            "advisory_id": advisory_id,
            "title": context.get("title"),
            "full_title": title,
            "affected_product": context.get("affected_product"),
            "criticality": context.get("criticality"),
            "threat_type": context.get("threat_type"),
            "exec_summary": context.get("exec_summary"),
            "exec_summary_parts": exec_summary_parts,
            "tlp": context.get("tlp"),
            "sectors": context.get("sectors"),
            "regions": context.get("regions"),
            "cves": context.get("cves"),
            "recommendations": context.get("recommendations"),
            "patch_details": context.get("patch_details"),
            "references": [item.get('link')] if item.get('link') else [],
            "mitre": mitre,
            "published": item.get('published', ''),
            "vendor": context.get('vendor'),
        }

        try:
            render_html("templates", final_context, html_path)

            # Return ALL fields for database insertion
            results.append({
                "advisory_id": advisory_id,
                "title": final_context["title"],
                "full_title": final_context.get("full_title"),
                "html_path": os.path.abspath(html_path),
                "criticality": final_context["criticality"],
                "threat_type": final_context.get("threat_type"),
                "affected_product": final_context.get("affected_product"),
                "exec_summary": final_context.get("exec_summary"),
                "tlp": final_context.get("tlp"),
                "sectors": final_context.get("sectors", []),
                "regions": final_context.get("regions", []),
                "cves": final_context.get("cves", []),
                "recommendations": final_context.get("recommendations", []),
                "patch_details": final_context.get("patch_details", []),
                "references": final_context.get("references", []),
                "mitre": mitre,
                "published": final_context.get("published"),
                "vendor": final_context.get("vendor"),
            })
            seen.add(item["id"]) if item.get("id") else None
        except Exception as e:
            logger.error(f"[Render] Failed to render {filename}: {e}")
            continue

    save_seen_items(workspace, seen)

    # Use ensure_ascii=True to avoid Windows encoding issues
    print(json.dumps({"generated": results}, ensure_ascii=True))


if __name__ == "__main__":
    max_items = 3
    if len(sys.argv) > 1:
        try:
            max_items = int(sys.argv[1])
        except Exception:
            pass
    run(max_items)
