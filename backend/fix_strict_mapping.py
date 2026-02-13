#!/usr/bin/env python3
"""
Change ti-generated-advisories index dynamic setting from strict to true
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

def fix_dynamic_mapping():
    """Change index dynamic setting from strict to true"""

    client = get_opensearch_client()

    # Change index-level dynamic setting
    mapping = {
        "dynamic": True
    }

    try:
        logger.info(f"Changing dynamic mapping setting for {ADVISORY_INDEX} from 'strict' to 'true'...")

        # Update mapping
        response = client.indices.put_mapping(
            index=ADVISORY_INDEX,
            body=mapping
        )

        logger.info(f"[SUCCESS] Successfully updated dynamic setting: {response}")
        print(f"[SUCCESS] Mapping updated successfully for index: {ADVISORY_INDEX}")
        print("[OK] Index now allows dynamic fields while maintaining defined mappings")

        # Verify mapping
        current_mapping = client.indices.get_mapping(index=ADVISORY_INDEX)
        dynamic_setting = current_mapping[ADVISORY_INDEX]['mappings'].get('dynamic', 'not set')
        print(f"[OK] Current dynamic setting: {dynamic_setting}")

        return True

    except Exception as e:
        logger.error(f"[ERROR] Failed to update mapping: {e}")
        print(f"[ERROR] Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_dynamic_mapping()
    sys.exit(0 if success else 1)
