#!/usr/bin/env python3
"""
HTML Renderer for SOC Advisory (JSON → HTML)
On-demand only (Preview / Email)
"""

import os
import json
from jinja2 import Environment, FileSystemLoader, select_autoescape

from utils.common import ensure_dir, logger


# ============================================================
# JINJA ENV
# ============================================================

def get_jinja_env(template_dir: str) -> Environment:
    return Environment(
        loader=FileSystemLoader(template_dir),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


# ============================================================
# LOAD ADVISORY JSON
# ============================================================

def load_advisory_json(advisory_id: str, workspace: str) -> dict:
    path = os.path.join(
        workspace,
        "advisories",
        "draft",
        f"{advisory_id}.json",
    )

    if not os.path.exists(path):
        raise FileNotFoundError(f"Advisory JSON not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# RENDER HTML (CORE)
# ============================================================

def render_advisory_html(
    advisory: dict,
    template_dir: str = "templates",
    template_name: str = "advisory_4.html",
) -> str:
    """
    Render advisory JSON into HTML string
    """

    env = get_jinja_env(template_dir)
    template = env.get_template(template_name)

    # --------------------------------------------------------
    # CONTEXT (MATCHES YOUR TEMPLATE EXACTLY)
    # --------------------------------------------------------
    context = {
        "advisory_id": advisory["advisory_id"],
        "title": advisory["display_title"],
        "criticality": advisory["criticality"],
        "threat_type": advisory["threat_type"],
        "tlp": advisory["tlp"],

        # 🔑 executive summary (already split)
        "exec_summary_parts": advisory["exec_summary_parts"],

        "affected_product": advisory.get("affected_product", "Not specified"),
        "vendor": advisory.get("vendor", "Unknown"),

        "cves": advisory.get("cves", []),
        "cvss": advisory.get("cvss", {}),

        "sectors": advisory.get("sectors", []),
        "regions": advisory.get("regions", []),

        "recommendations": advisory.get("recommendations", []),
        "patch_details": advisory.get("patch_details", []),

        # 🔑 template expects list[str]
        "references": advisory.get("references", []),

        # tables
        "mitre": advisory.get("mitre", []),
        "mbc": advisory.get("mbc", []),

        "created_at": advisory.get("created_at"),
    }

    return template.render(**context)


# ============================================================
# PREVIEW HELPER (OPTIONAL)
# ============================================================

def preview_advisory_html(
    advisory_id: str,
    workspace: str,
    template_dir: str = "templates",
    template_name: str = "advisory_4.html",
) -> str:
    """
    Render HTML and save it to workspace/html_cache/
    """
    advisory = load_advisory_json(advisory_id, workspace)

    html = render_advisory_html(
        advisory,
        template_dir=template_dir,
        template_name=template_name,
    )

    out_dir = os.path.join(workspace, "html_cache")
    ensure_dir(out_dir)

    out_path = os.path.join(out_dir, f"{advisory_id}.html")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    logger.info(f"HTML preview generated: {out_path}")

    return out_path


# ============================================================
# CLI (DEBUG / LOCAL)
# ============================================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: advisory_html.py <workspace> <advisory_id>")
        sys.exit(1)

    preview_advisory_html(
        advisory_id=sys.argv[2],
        workspace=sys.argv[1],
    )