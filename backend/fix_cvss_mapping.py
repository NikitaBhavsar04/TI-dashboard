#!/usr/bin/env python3
"""
Fix CVSS field mapping to allow dynamic CVE fields in ti-generated-advisories index
"""

import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from utils.opensearch_client import get_opensearch_client
from utils.common import logger

ADVISORY_INDEX = "ti-generated-advisories"

def fix_cvss_mapping():
    """Update cvss field mapping to allow dynamic CVE fields"""

    client = get_opensearch_client()

    # Change cvss from nested to object type with dynamic fields allowed
    mapping = {
        "properties": {
            "cvss": {
                "type": "object",
                "dynamic": True,
                "properties": {
                    "criticality": {"type": "keyword"},
                    "cve": {"type": "keyword"},
                    "score": {"type": "float"},
                    "source": {"type": "keyword"},
                    "vector": {"type": "keyword"}
                }
            }
        }
    }

    try:
        logger.info(f"Updating cvss field mapping in {ADVISORY_INDEX}...")

        # Update mapping
        response = client.indices.put_mapping(
            index=ADVISORY_INDEX,
            body=mapping
        )

        logger.info(f"[SUCCESS] Successfully updated cvss mapping: {response}")
        print(f"[SUCCESS] Mapping updated successfully for index: {ADVISORY_INDEX}")

        # Verify mapping
        current_mapping = client.indices.get_mapping(index=ADVISORY_INDEX)
        print("[OK] Current cvss mapping:")
        import json
        print(json.dumps(current_mapping[ADVISORY_INDEX]['mappings']['properties']['cvss'], indent=2))

        return True

    except Exception as e:
        logger.error(f"[ERROR] Failed to update mapping: {e}")
        print(f"[ERROR] Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_cvss_mapping()
    sys.exit(0 if success else 1)
