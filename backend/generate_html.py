#!/usr/bin/env python3
"""
Standalone HTML generator for manually created advisories.
Reads advisory JSON from stdin and generates HTML file.
"""

import sys
import json
import os
from renderer.render import render_html
from utils.common import sanitize_filename, ensure_dir, logger

def main():
    try:
        # Read advisory data from stdin
        input_data = sys.stdin.read()
        advisory_data = json.loads(input_data)
        
        logger.info(f"Generating HTML for advisory: {advisory_data.get('advisory_id')}")
        
        # Get workspace directory (backend/workspace)
        workspace = os.path.join(os.path.dirname(__file__), "workspace")
        ensure_dir(workspace)
        
        # Prepare output path
        advisory_id = advisory_data.get("advisory_id", "UNKNOWN")
        out_html = os.path.join(workspace, f"{sanitize_filename(advisory_id)}.html")
        
        # Prepare context for template
        context = {
            "advisory_id": advisory_data.get("advisory_id"),
            "title": advisory_data.get("title", "Threat Advisory"),
            "criticality": advisory_data.get("criticality", "MEDIUM"),
            "threat_type": advisory_data.get("threat_type", "General"),
            "exec_summary_parts": advisory_data.get("exec_summary_parts", []),
            "affected_product": advisory_data.get("affected_product", "Not specified"),
            "vendor": advisory_data.get("vendor", "Unknown"),
            "cves": advisory_data.get("cves", []),
            "sectors": advisory_data.get("sectors", ["General"]),
            "regions": advisory_data.get("regions", ["Global"]),
            "recommendations": advisory_data.get("recommendations", []),
            "patch_details": advisory_data.get("patch_details"),
            "references": advisory_data.get("references", []),
            "tlp": advisory_data.get("tlp", "AMBER"),
            "mitre": advisory_data.get("mitre", []),
            "published": advisory_data.get("published", ""),
            "source": advisory_data.get("source", "Manual Entry"),
        }
        
        # Get templates directory
        templates_dir = os.path.join(os.path.dirname(__file__), "templates")
        
        # Render HTML
        render_html(templates_dir, context, out_html)
        
        logger.info(f"HTML generated successfully: {out_html}")
        print(f"SUCCESS: {out_html}")
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ Failed to generate HTML: {e}", exc_info=True)
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
