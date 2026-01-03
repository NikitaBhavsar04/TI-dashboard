import requests, time
from typing import Dict, List
from utils.common import logger

NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"

def fetch_cve(cve_id: str) -> Dict:
    params = {"cveId": cve_id}
    r = requests.get(NVD_BASE, params=params, timeout=30)
    if r.status_code == 429:
        time.sleep(2); r = requests.get(NVD_BASE, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("vulnerabilities"):
        return {"cveId": cve_id}
    return data["vulnerabilities"][0]["cve"]

def summarize_cve_meta(cve: Dict) -> Dict:
    out = {"id": cve.get("id"), "descriptions": "", "cvss": {}, "weaknesses": []}
    descs = cve.get("descriptions", [])
    if descs:
        out["descriptions"] = " ".join(d.get("value","") for d in descs if d.get("lang") == "en")
    metrics = cve.get("metrics", {})
    for key in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
        if key in metrics and metrics[key]:
            m = metrics[key][0]
            out["cvss"] = {
                "baseScore": m.get("cvssData",{}).get("baseScore"),
                "baseSeverity": m.get("cvssData",{}).get("baseSeverity", m.get("baseSeverity"))
            }
            break
    for w in cve.get("weaknesses", []):
        for d in w.get("description", []):
            if d.get("lang") == "en":
                out["weaknesses"].append(d.get("value"))
    return out
