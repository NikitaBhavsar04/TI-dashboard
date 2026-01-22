# enrichment/cvss.py

import requests
from typing import Optional, Dict
from utils.common import logger

NVD_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
TIMEOUT = 10


def fetch_cvss(cve_id: str) -> Optional[Dict]:
    """
    Fetch CVSS details from NVD.
    Severity returned here IS the criticality.
    """
    try:
        resp = requests.get(
            NVD_API,
            params={"cveId": cve_id},
            timeout=TIMEOUT,
            headers={"User-Agent": "SOC-CVSS-Enricher/1.0"},
        )

        if resp.status_code != 200:
            return None

        data = resp.json()
        vulns = data.get("vulnerabilities", [])
        if not vulns:
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
            return None

        score = cvss.get("baseScore")
        severity = cvss.get("baseSeverity")

        if score is None or severity is None:
            return None

        return {
            "cve": cve_id,
            "score": float(score),
            "criticality": severity.upper(),  # normalize
            "vector": cvss.get("vectorString"),
            "version": version,
        }

    except Exception as e:
        logger.warning(f"[CVSS] Failed for {cve_id}: {e}")
        return None