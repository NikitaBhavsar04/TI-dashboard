# enrichment/cvss.py

import requests
import os
from typing import Optional, Dict
from utils.common import logger

NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
TIMEOUT = 10


def fetch_cvss(cve_id: str) -> Optional[Dict]:
    """
    Fetch CVSS details from NVD.
    Severity returned here IS the criticality.
    """
    # Smart development environment detection
    is_development = (
        os.getenv('NODE_ENV') == 'development' or
        os.getenv('DISABLE_SSL_VERIFY') == 'true' or
        os.getenv('VERCEL') is None and  # Not on Vercel (production platform)
        ('localhost' in os.getcwd() or 'venv' in os.getcwd() or 'Scripts' in os.environ.get('PATH', ''))
    )
    
    # Determine SSL verification based on environment
    ssl_verify = not is_development
        
    def make_request(verify_ssl=True):
        return requests.get(
            NVD_API,
            params={"cveId": cve_id},
            timeout=TIMEOUT,
            headers={"User-Agent": "SOC-CVSS-Enricher/1.0"},
            verify=verify_ssl,
        )
    
    try:
        resp = make_request(verify_ssl=ssl_verify)
    except requests.exceptions.SSLError as e:
        # Always try SSL fallback for SSL errors
        logger.warning(f"[CVSS] SSL verification failed for {cve_id}, retrying without verification: {e}")
        try:
            resp = make_request(verify_ssl=False)
        except Exception as retry_e:
            logger.warning(f"[CVSS] Failed for {cve_id}: {retry_e}")
            return None
    except Exception as e:
        logger.warning(f"[CVSS] Failed for {cve_id}: {e}")
        return None

    if resp.status_code != 200:
        logger.warning(f"[CVSS] NVD returned status {resp.status_code} for {cve_id}")
        return None

    data = resp.json()
    vulns = data.get("vulnerabilities", [])
    
    logger.info(f"[CVSS] NVD response for {cve_id}: {len(vulns)} vulnerabilities found")
    if not vulns:
        # Check if CVE is very new or doesn't exist yet
        if cve_id.startswith(('CVE-2025-', 'CVE-2026-')):
            logger.info(f"[CVSS] CVE {cve_id} appears to be from future year - may not be in NVD database yet")
        return None

    metrics = vulns[0]["cve"].get("metrics", {})

    cvss = None
    version = None

    if "cvssMetricV31" in metrics:
        cvss = metrics["cvssMetricV31"][0]["cvssData"]
        version = "3.1"
    elif "cvssMetricV30" in metrics:
        cvss = metrics["cvssMetricV30"][0]["cvssData"]
        version = "3.0"
    elif "cvssMetricV40" in metrics:
        cvss = metrics["cvssMetricV40"][0]["cvssData"]
        version = "4.0"
    else:
        logger.warning(f"[CVSS] No CVSS metrics found for {cve_id}")
        return None

    score = cvss.get("baseScore")
    severity = cvss.get("baseSeverity")

    if score is None or severity is None:
        logger.warning(f"[CVSS] Missing score/severity data for {cve_id}: score={score}, severity={severity}")
        return None

    result = {
        "cve": cve_id,
        "score": float(score),
        "criticality": severity.upper(),  # normalize
        "vector": cvss.get("vectorString"),
        "version": version,
        "source": "NVD"
    }
    
    logger.info(f"[CVSS] Successfully retrieved {cve_id}: score={result['score']}, criticality={result['criticality']}")
    return result