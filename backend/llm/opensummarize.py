# llm/opensummarize.py

import os
import json
import re
from typing import Dict, List, Optional, Any

from openai import OpenAI
from dotenv import load_dotenv

from utils.common import logger, read_yaml


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================
load_dotenv()


# ============================================================
# CONFIG
# ============================================================
OPENROUTER_BASE = "https://openrouter.ai/api/v1"
cfg = read_yaml("config.yaml")

or_cfg = cfg.get("openrouter", {})
if not or_cfg.get("enabled", False):
    raise RuntimeError("OpenRouter is disabled in config.yaml")

OPENROUTER_MODEL = or_cfg.get("model")
if not OPENROUTER_MODEL:
    raise RuntimeError("openrouter.model missing in config.yaml")


# ============================================================
# CONSTANTS
# ============================================================
VALID_CRITICALITY = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

ALLOWED_SECTORS = {
    "Financial Services",
    "Healthcare",
    "Government",
    "Energy & Utilities",
    "General",
    "Technology",
    "Manufacturing",
    "Retail",
    "Education",
    "Transportation",
    "Telecommunications",
    "Defense",
    "Critical Infrastructure",
    "Media & Entertainment",
    "Real Estate",
    "Legal Services",
    "Non-Profit",
    "Other",
}

ALLOWED_REGIONS = {
    "North America",
    "South America",
    "Europe",
    "Asia-Pacific",
    "Middle East",
    "Africa",
    "Global",
    "Arctic",
    "Caribbean",
    "Central Asia",
    "Eastern Europe",
    "Western Europe",
    "Southeast Asia",
    "East Asia",
    "South Asia",
    "Oceania",
}

# NOTE: This is used only for explicit region detection in text (not LLM output)
REGION_KEYWORDS = {
    "North America": [
        "united states", "u.s.", "usa", "canada", "mexico", "north america"
    ],
    "South America": [
        "south america", "brazil", "argentina", "chile", "colombia", "peru"
    ],
    "Europe": [
        "europe", "eu", "european", "germany", "france", "uk", "united kingdom",
        "italy", "spain", "netherlands", "sweden", "norway", "poland", "romania"
    ],
    "Asia-Pacific": [
        "asia-pacific", "apac", "australia", "new zealand", "singapore", "japan",
        "south korea", "korea", "hong kong", "taiwan"
    ],
    "East Asia": ["east asia", "china", "japan", "taiwan", "hong kong", "korea", "south korea"],
    "South Asia": ["south asia", "india", "pakistan", "bangladesh", "sri lanka", "nepal"],
    "Southeast Asia": ["southeast asia", "asean", "indonesia", "malaysia", "thailand", "vietnam", "philippines"],
    "Middle East": ["middle east", "gcc", "saudi", "uae", "qatar", "israel", "iran", "iraq", "lebanon"],
    "Africa": ["africa", "nigeria", "kenya", "south africa", "egypt", "morocco", "tunisia"],
    "Oceania": ["oceania", "australia", "new zealand"],
    "Caribbean": ["caribbean", "jamaica", "trinidad", "bahamas", "barbados"],
    "Central Asia": ["central asia", "kazakhstan", "uzbekistan", "kyrgyzstan", "tajikistan", "turkmenistan"],
    "Eastern Europe": ["eastern europe", "ukraine", "belarus", "moldova", "bulgaria"],
    "Western Europe": ["western europe", "netherlands", "belgium", "luxembourg", "switzerland", "austria"],
    "Arctic": ["arctic"],
    "Global": ["global", "worldwide"],
}

SECTOR_KEYWORDS = {
    "Financial Services": ["bank", "banking", "financial", "fintech", "payment", "payments", "credit union", "atm", "swift"],
    "Healthcare": ["hospital", "healthcare", "clinic", "medical", "patient", "pharma", "ehr", "hl7"],
    "Government": ["government", "ministry", "municipal", "public sector", "agency", "state-sponsored"],
    "Energy & Utilities": ["energy", "oil", "gas", "utility", "utilities", "power grid", "electric", "water treatment"],
    "Technology": ["cloud", "saas", "software", "it provider", "tech company", "datacenter", "hosting"],
    "Manufacturing": ["manufacturing", "industrial", "factory", "plant", "ot environment", "ics", "scada", "plc"],
    "Retail": ["retail", "e-commerce", "ecommerce", "point of sale", "pos", "merchant"],
    "Education": ["university", "college", "school", "education", "campus"],
    "Transportation": ["transport", "transportation", "rail", "airline", "airport", "shipping", "logistics", "port"],
    "Telecommunications": ["telecom", "telecommunications", "isp", "carrier", "mobile operator", "5g", "lte"],
    "Defense": ["defense", "military", "armed forces", "navy", "air force"],
    "Critical Infrastructure": ["critical infrastructure", "water", "power", "grid", "nuclear", "dam"],
    "Media & Entertainment": ["media", "broadcast", "streaming", "entertainment", "publisher"],
    "Real Estate": ["real estate", "property management", "housing association"],
    "Legal Services": ["law firm", "legal", "attorney", "solicitor"],
    "Non-Profit": ["non-profit", "ngo", "charity", "foundation"],
}


# ============================================================
# REGEX
# ============================================================
CVE_RE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

CVSS_RE = re.compile(r"CVSS\s*v?3(?:\.\d)?\s*[:\-]?\s*([0-9]+\.[0-9]+)", re.IGNORECASE)

PATCH_SNIPPET_RE = re.compile(
    r"\b(fixed in|patched in|upgrade to|update to|security update|hotfix|workaround|mitigation)\b.{0,180}",
    re.IGNORECASE,
)


# ============================================================
# NORMALIZERS / EXTRACTORS
# ============================================================
def ensure_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return []
        return [v.strip() for v in re.split(r"[,\n]+", s) if v.strip()]
    return []


def normalize_sectors(raw) -> List[str]:
    if not raw:
        return ["General"]

    raw_list = raw if isinstance(raw, list) else [raw]
    normalized: List[str] = []
    for item in raw_list:
        item_clean = str(item).strip()
        for allowed in ALLOWED_SECTORS:
            if item_clean.lower() == allowed.lower():
                normalized.append(allowed)

    return normalized or ["General"]


def normalize_regions(raw) -> List[str]:
    # IMPORTANT FIX:
    # Your prompt says regions should be [] unless explicitly stated.
    # So do NOT default to ["Global"] here.
    if not raw:
        return []

    raw_list = raw if isinstance(raw, list) else [raw]
    normalized: List[str] = []
    for item in raw_list:
        item_clean = str(item).strip()
        for allowed in ALLOWED_REGIONS:
            if item_clean.lower() == allowed.lower():
                normalized.append(allowed)

    return normalized or []


def extract_cves(text: str) -> List[str]:
    return sorted(set(m.group(0).upper() for m in CVE_RE.finditer(text or "")))


def extract_cvss_score(text: str) -> Optional[float]:
    m = CVSS_RE.search(text or "")
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def cvss_to_criticality(score: float) -> str:
    if score >= 9.0:
        return "CRITICAL"
    if score >= 7.0:
        return "HIGH"
    if score >= 4.0:
        return "MEDIUM"
    return "LOW"


def extract_patch_snippets(text: str, limit: int = 5) -> Optional[List[str]]:
    if not text:
        return None
    hits: List[str] = []
    for m in PATCH_SNIPPET_RE.finditer(text):
        hits.append((text[m.start(): m.end()] or "").strip())
        if len(hits) >= limit:
            break
    return hits or None


def count_sentences(text: str) -> int:
    return len([s for s in re.split(r"[.!?]+", text or "") if s.strip()])


def infer_regions_from_text(source_text: str) -> List[str]:
    """Return regions ONLY if explicit signals exist in source text; else []."""
    t = (source_text or "").lower()
    found = set()
    for region, kws in REGION_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                found.add(region)
                break

    # Keep only allowed region labels
    out = [r for r in ALLOWED_REGIONS if r in found]
    return out


def infer_sectors_from_text(source_text: str) -> List[str]:
    """Conservative sector inference from source text; fallback General."""
    t = (source_text or "").lower()
    found = set()
    for sector, kws in SECTOR_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                found.add(sector)
                break

    out = [s for s in ALLOWED_SECTORS if s in found]
    return out or ["General"]

def reconcile_regions(regions: List[str]) -> List[str]:
    regions = [r for r in (regions or []) if r]
    # If Global + specifics -> remove Global
    if "Global" in regions and len(regions) > 1:
        regions = [r for r in regions if r != "Global"]
    # de-dup while preserving order
    out = []
    seen = set()
    for r in regions:
        if r not in seen:
            out.append(r)
            seen.add(r)
    return out


# ============================================================
# PROMPT
# ============================================================
def build_prompt_single(item: Dict, source_text: str) -> str:
    title = item.get("title", "")
    link = item.get("article_url") or item.get("link", "")
    summary = item.get("summary", "")

    source_text = (source_text or "").strip()
    if len(source_text) > 15000:
        source_text = source_text[:15000] + "\n[TRUNCATED]"

    json_schema = """{
      "title": "",
      "affected_product": "",
      "vendor": "",
      "criticality": "",
      "threat_type": "",
      "exec_summary": "",
      "cves": [],
      "tlp": "AMBER",
      "attack_keywords": [],
      "sectors": [],
      "regions": [],
      "recommendations": [],
      "patch_details": null,
      "references": []
    }"""

    return f"""
THREAT INTELLIGENCE ADVISORY — SOC / CTI ANALYSIS
(SINGLE THREAT ITEM ONLY)

You are a senior Threat Intelligence analyst.
Analyze ONLY the threat described below.
Do NOT include unrelated vulnerabilities, malware, or campaigns.

=====================
INPUT CONTEXT
=====================
Title: {title}
Link: {link}
Summary: {summary}

=====================
SOURCE MATERIAL
=====================
{source_text}

=====================
MANDATORY EXTRACTION RULES
=====================

1. title
- MUST be a SHORT SOC-style title (maximum 4-5 words)
- MUST follow this EXACT format:
  <Vulnerability Type> – <Affected Product>

2. affected_product
- MUST be the EXACT product or software name impacted
- MUST be extracted from SOURCE MATERIAL
- MUST include version numbers IF explicitly stated

3. threat_type
- MUST be 1 or 2 words ONLY

=====================
EXECUTIVE SUMMARY RULES (STRICT)
=====================
exec_summary MUST contain EXACTLY 3 paragraphs without any heading and minimum 17 lines.
Paragraphs MUST be separated by two newline characters (\\n\\n)
TOTAL sentences across all paragraphs: 20-22 ONLY
No bullet points.
No repetition.
No names.
No URLs.

=====================
SECTORS & REGIONS
=====================
sectors:
- Extract from SOURCE MATERIAL or infer conservatively
- If unclear, return ["General"]

regions:
- ONLY include if explicitly stated in SOURCE MATERIAL
- Otherwise, return an empty list []

=====================
PATCH & MITIGATION RULES
=====================
patch_details:
- MUST be copied VERBATIM from SOURCE MATERIAL if present
- If no explicit patch or workaround exists, return null

CVEs
- Extract ALL CVE IDs if explicitly mentioned in SOURCE MATERIAL
- If NO CVE is mentioned, return one of the following strings:
  - "No CVE – Active Threat Campaign"
  - "No CVE – Exploitation Technique"
  - "No CVE – Misconfiguration or Abuse"
- NEVER invent a CVE

=====================
OUTPUT REQUIREMENTS
=====================
Return ONLY valid JSON matching the schema below.
Do NOT include markdown.
Do NOT include explanations.
Do NOT include extra text.
First character MUST be "{{"
Last character MUST be "}}"

JSON SCHEMA:
{json_schema}
""".strip()


# ============================================================
# TOKEN ESTIMATION
# ============================================================
def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, len(text) // 4)


def count_llm_tokens(*, title: str, summary: str, source_text: str, prompt: str, output: str) -> Dict[str, int]:
    input_tokens = (
        estimate_tokens(title)
        + estimate_tokens(summary)
        + estimate_tokens(source_text)
        + estimate_tokens(prompt)
    )
    output_tokens = estimate_tokens(output)
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
    }


# ============================================================
# CHAT CALL
# ============================================================
def call_llm(prompt: str, max_tokens: int = 2200) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set in .env file")

    import httpx
    
    # Smart development environment detection
    is_development = (
        os.getenv('NODE_ENV') == 'development' or
        os.getenv('DISABLE_SSL_VERIFY') == 'true' or
        os.getenv('VERCEL') is None and  # Not on Vercel (production platform)
        ('localhost' in os.getcwd() or 'venv' in os.getcwd() or 'Scripts' in os.environ.get('PATH', ''))
    )
    
    # Try with SSL verification first
    ssl_verify = not is_development
    
    def make_request(verify_ssl=True):
        http_client = httpx.Client(verify=verify_ssl)
        client = OpenAI(
            base_url=OPENROUTER_BASE,
            api_key=api_key,
            http_client=http_client,
            default_headers={
                "HTTP-Referer": "https://your-soc-platform.local",
                "X-Title": "Threat Intelligence Pipeline",
            },
        )

        return client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": "You are a threat intelligence analyst."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
    
    logger.info(f"[LLM] Using OpenRouter model: {OPENROUTER_MODEL}")
    if is_development:
        logger.info("[LLM] Development environment detected, SSL verification disabled")
    
    try:
        resp = make_request(verify_ssl=ssl_verify)
        return (resp.choices[0].message.content or "").strip()
        
    except Exception as e:
        # Always try SSL fallback for any SSL-related error
        if 'ssl' in str(e).lower() or 'certificate' in str(e).lower() or 'connection' in str(e).lower():
            logger.warning(f"[LLM] SSL/Connection error detected, retrying without SSL verification: {e}")
            try:
                resp = make_request(verify_ssl=False)
                return (resp.choices[0].message.content or "").strip()
            except Exception as retry_e:
                logger.error(f"[LLM] Failed even without SSL verification: {retry_e}")
                raise retry_e
        else:
            logger.error(f"[LLM] Request failed: {e}")
            raise e


# ============================================================
# OUTPUT NORMALIZATION
# ============================================================
def normalize_llm_output(raw: str, item: Dict, source_text: str) -> Dict:
    try:
        data = json.loads(raw) if raw else {}
        if not isinstance(data, dict):
            data = {}
    except Exception:
        logger.error("[LLM] Invalid JSON returned")
        data = {}

    exec_summary = str(data.get("exec_summary", "") or "")
    sentence_count = count_sentences(exec_summary)
    if sentence_count < 18 or sentence_count > 24:
        logger.warning(f"[LLM] exec_summary sentence count {sentence_count} (expected ~20-22)")

    # ----------------------------
    # CVEs: merge LLM + extracted
    # ----------------------------
    llm_cves = ensure_list(data.get("cves"))
    text_cves = extract_cves(source_text)
    merged = sorted(set([c.upper() for c in (llm_cves + text_cves) if c]))

    if any(c.startswith("CVE-") for c in merged):
        merged = [c for c in merged if c.startswith("CVE-")]

    if not merged:
        threat_type = str(data.get("threat_type", "")).lower()
        if any(k in threat_type for k in ["malware", "ransomware", "apt", "campaign"]):
            merged = ["No CVE – Active Threat Campaign"]
        elif any(k in threat_type for k in ["phishing", "credential"]):
            merged = ["No CVE – Exploitation Technique"]
        else:
            merged = ["No CVE – Vulnerability Not Assigned"]

    cves = merged

    # ----------------------------
    # CVSS → Criticality
    # ----------------------------
    cvss_score = extract_cvss_score((source_text or "") + " " + exec_summary)
    if cvss_score is not None:
        criticality = cvss_to_criticality(cvss_score)
    else:
        cand = str(data.get("criticality", "MEDIUM") or "").upper()
        criticality = cand if cand in VALID_CRITICALITY else "MEDIUM"

    # ----------------------------
    # Patch details
    # ----------------------------
    patch_details = ensure_list(data.get("patch_details")) or (extract_patch_snippets(source_text) or [])

    # ----------------------------
    # Sectors & Regions (FIX)
    # - Normalize LLM values
    # - If LLM gives nothing / generic fallback, infer from text
    # ----------------------------
    llm_sectors = normalize_sectors(data.get("sectors"))
    if not llm_sectors or llm_sectors == ["General"]:
        llm_sectors = infer_sectors_from_text(source_text)

    llm_regions = normalize_regions(data.get("regions"))
    if not llm_regions:
        llm_regions = infer_regions_from_text(source_text)
    llm_regions = reconcile_regions(llm_regions)

    return {
        "title": data.get("title") or item.get("title", "Threat Advisory"),
        "affected_product": data.get("affected_product", "Unknown Product"),
        "vendor": data.get("vendor", "Unknown Vendor"),
        "criticality": criticality,
        "threat_type": data.get("threat_type", "Vulnerability"),
        "exec_summary": exec_summary,
        "cves": cves,
        "tlp": data.get("tlp", "AMBER"),
        "attack_keywords": ensure_list(data.get("attack_keywords")),
        "sectors": llm_sectors,
        "regions": llm_regions,
        "recommendations": ensure_list(data.get("recommendations")),
        "patch_details": patch_details if patch_details else None,
        "references": ensure_list(data.get("references")),
    }


# ============================================================
# PUBLIC API
# ============================================================
def summarize_item(item: Dict, source_text: str) -> Dict:
    prompt = build_prompt_single(item, source_text)
    raw = call_llm(prompt)

    token_stats = count_llm_tokens(
        title=item.get("title", ""),
        summary=item.get("summary", ""),
        source_text=source_text or "",
        prompt=prompt,
        output=raw,
    )

    logger.info(
        f"[TOKENS] input={token_stats['input_tokens']} | "
        f"output={token_stats['output_tokens']} | "
        f"total={token_stats['total_tokens']}"
    )

    result = normalize_llm_output(raw, item, source_text)
    result["_llm_tokens"] = token_stats
    return result