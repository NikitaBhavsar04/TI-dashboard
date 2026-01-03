"""
MITRE TAXII Server Configuration - WORKING VERSION
"""
import sys
import logging
from pathlib import Path

# Configure logging to stderr
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# ===== CORRECT MITRE ATT&CK TAXII 2.1 URLs =====
TAXII_SERVER_BASE = "https://attack-taxii.mitre.org"
TAXII_DISCOVERY_URL = "https://attack-taxii.mitre.org/taxii2/"
TAXII_API_ROOT = "https://attack-taxii.mitre.org/api/v21"

# Collection IDs for different ATT&CK matrices
COLLECTIONS = {
    "enterprise": {
        "id": "x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019",
        "name": "Enterprise ATT&CK"
    },
    "mobile": {
        "id": "x-mitre-collection--dac0d2d7-8653-445c-9bff-82f934c1e858",
        "name": "Mobile ATT&CK"
    },
    "ics": {
        "id": "x-mitre-collection--23a6fb3b-1d2e-47ba-a99f-3ea2b61f3658",
        "name": "ICS ATT&CK"
    }
}

# Directory paths
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"
LOGS_DIR = BASE_DIR / "logs"

# Create directories if they don't exist
for directory in [DATA_DIR, CACHE_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Cache settings
CACHE_EXPIRY_HOURS = 24

# Logging
LOG_FILE = LOGS_DIR / "taxii_connector.log"
LOG_LEVEL = "INFO"

# Log configuration details to stderr (not stdout)
logger.info("Configuration loaded")
logger.info(f"TAXII Discovery URL: {TAXII_DISCOVERY_URL}")
logger.info(f"API Root: {TAXII_API_ROOT}")
TAXII_DISCOVERY_URL = "https://attack-taxii.mitre.org/taxii2/"