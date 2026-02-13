#!/usr/bin/env python3
"""
Add ip_sweep field to ti-generated-advisories index mapping
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

def add_ip_sweep_mapping():
    """Add ip_sweep field mapping to advisory index"""

    client = get_opensearch_client()

    # Define the ip_sweep field mapping
    mapping = {
        "properties": {
            "ip_sweep": {
                "type": "object",
                "properties": {
                    "advisory_id": {"type": "keyword"},
                    "checked_at": {"type": "date"},
                    "impacted_clients": {
                        "type": "nested",
                        "properties": {
                            "client_id": {"type": "keyword"},
                            "client_name": {"type": "text"},
                            "matches": {
                                "type": "nested",
                                "properties": {
                                    "ioc": {"type": "ip"},
                                    "matched_field": {"type": "keyword"},
                                    "log_index": {"type": "keyword"},
                                    "timestamp": {"type": "date"}
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    try:
        logger.info(f"Adding ip_sweep field mapping to {ADVISORY_INDEX}...")

        # Update mapping
        response = client.indices.put_mapping(
            index=ADVISORY_INDEX,
            body=mapping
        )

        logger.info(f"[SUCCESS] Successfully added ip_sweep mapping: {response}")
        print(f"[SUCCESS] Mapping updated successfully for index: {ADVISORY_INDEX}")

        # Verify mapping
        current_mapping = client.indices.get_mapping(index=ADVISORY_INDEX)
        if 'ip_sweep' in str(current_mapping):
            print("[OK] Verified: ip_sweep field is now in the mapping")
        else:
            print("[WARNING] Could not verify ip_sweep field in mapping")

        return True

    except Exception as e:
        logger.error(f"[ERROR] Failed to add mapping: {e}")
        print(f"[ERROR] Error: {e}")
        return False

if __name__ == "__main__":
    success = add_ip_sweep_mapping()
    sys.exit(0 if success else 1)
