# llm/summary.py

import os
import json
import re
from typing import Dict, List, Optional
from openai import OpenAI

from utils.common import logger, read_yaml

# ============================================================
# CONFIG
# ============================================================
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

# ============================================================
# REGEX
# ============================================================

CVE_RE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

CVSS_RE = re.compile(
    r"CVSS\s*v?3(?:\.\d)?\s*[:\-]?\s*([0-9]+\.[0-9]+)",
    re.IGNORECASE
)

PATCH_SNIPPET_RE = re.compile(
    r"\b(fixed in|patched in|upgrade to|update to|security update|hotfix|"
    r"workaround|mitigation)\b.{0,180}",
    re.IGNORECASE,
)
ALLOWED_SECTORS = {
    "General",
    "Financial Services",
    "Healthcare",
    "Government",
    "Energy & Utilities",
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

REGION_KEYWORDS = {
    "United States": ["united states", "u.s.", "usa"],
    "China": ["china"],
    "India": ["india"],
    "Germany": ["germany"],
    "France": ["france"],
    "Europe": ["europe", "eu"],
    "Asia": ["asia", "apac"],
}
def normalize_sectors(raw) -> list[str]:
    if not raw:
        return ["General"]

    raw_list = raw if isinstance(raw, list) else [raw]
    normalized = []

    for item in raw_list:
        item_clean = item.strip().title()
        for allowed in ALLOWED_SECTORS:
            if item_clean.lower() == allowed.lower():
                normalized.append(allowed)

    return normalized or ["General"]

def normalize_regions(raw) -> list[str]:
    if not raw:
        return ["Global"]

    raw_list = raw if isinstance(raw, list) else [raw]
    normalized = []

    for item in raw_list:
        item_clean = item.strip().title()
        for allowed in ALLOWED_REGIONS:
            if item_clean.lower() == allowed.lower():
                normalized.append(allowed)

    return normalized or ["Global"]


# ============================================================
# PROMPT (❗ UNCHANGED ❗)
# ============================================================

def build_prompt_single(item: Dict, source_text: str) -> str:
    title = item.get("title", "")
    link = item.get("link", "")
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

You are a senior SOC Threat Intelligence analyst.
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

- Vulnerability Type examples:
  "Remote Code Execution"
  "Authentication Bypass"
  "Privilege Escalation"
  "SQL Injection"
  "Stored XSS"

- Affected Product rules:
  - MUST be the primary affected product name
  - MUST NOT include vendor name unless required for clarity
  - MUST NOT include CVE IDs
  - MUST NOT include version numbers unless ambiguity exists

Examples of VALID titles:
- "Remote Code Execution – Apache Tomcat"
- "Authentication Bypass – FortiOS SSL VPN"
- "Privilege Escalation – Windows Kernel"

Examples of INVALID titles:
- "Critical Vulnerability Discovered in Apache"
- "CVE-2024-12345 RCE"
- "Apache Tomcat 9.0.83 RCE Vulnerability"


2. affected_product
- MUST be the EXACT product or software name impacted
- MUST be extracted from SOURCE MATERIAL
- MUST include version numbers IF explicitly stated
- MUST use official vendor/product naming
- MUST NOT be generic (e.g., "Web Application", "Enterprise Software", "General Software")

Examples:
- "Apache Tomcat 9.0.83"
- "Microsoft Exchange Server 2019"
- "Ivanti Endpoint Manager Mobile"
- "FortiOS SSL VPN"

If the product is unclear:
- Use the MOST SPECIFIC product name mentioned
- Do NOT invent versions
- Do NOT return "General", "Unknown", or empty values

3. threat_type
- MUST be 1 or 2 words ONLY
- Examples:
  "RCE"
  "Privilege Escalation"
  "Authentication Bypass"
  "Information Disclosure"

=====================
EXECUTIVE SUMMARY RULES (STRICT)
=====================

exec_summary MUST contain EXACTLY **3 paragraphs** without any heading or sub paragraphs.
Paragraphs MUST be separated by **two newline characters (\\n\\n)**

Paragraph 1 — Overview (3–4 sentences):
- High-level description of the threat
- What it is and why it matters
- NO attribution, NO URLs, NO report references

Paragraph 2 — Technical Details (8–9 sentences):
- Technical attack mechanics and workflow
- Exploitation status (active, PoC, or theoretical)
- Attack vector, prerequisites, and exploitation flow
- Mention CVEs naturally if applicable
- Analyst tone only, NO speculation

Paragraph 3 — Impact & Exposure (3–4 sentences):
- Who is affected
- Industry sectors and environments at risk
- Exposure conditions and scale
- Include AT LEAST ONE sentence describing the impact of successful exploitation

TOTAL sentences across all paragraphs: **18–20 ONLY**
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
- Allowed phrases include: "fixed in", "patched in", "upgrade to", "security update"
- If no explicit patch or workaround exists, return null
- NEVER invent patch information

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

SELF-CHECK BEFORE RESPONDING:
- Verify exec_summary has exactly 3 paragraphs separated by \\n\\n
- Verify sentence counts meet the required limits
- Verify affected_product is specific and not generic
- If any rule is violated, regenerate internally before responding

JSON SCHEMA:
{json_schema}
""".strip()


# ============================================================
# HELPERS
# ============================================================
# ============================================================
# TOKEN ESTIMATION (MODEL-AGNOSTIC)
# ============================================================

def estimate_tokens(text: str) -> int:
    """
    Rough token estimation.
    1 token ≈ 4 characters (industry standard).
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


def count_llm_tokens(
    *,
    title: str,
    summary: str,
    source_text: str,
    prompt: str,
    output: str,
) -> Dict[str, int]:
    """
    Estimate token usage for SOC cost tracking & debugging.
    """

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


def ensure_list(val) -> List[str]:
    if not val:
        return []
    if isinstance(val, list):
        return [str(v).strip() for v in val if str(v).strip()]
    if isinstance(val, str):
        return [v.strip() for v in re.split(r"[,\n]+", val) if v.strip()]
    return []

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
    hits = []
    for m in PATCH_SNIPPET_RE.finditer(text):
        hits.append(text[m.start():m.end()].strip())
        if len(hits) >= limit:
            break
    return hits or None

def infer_regions(text: str) -> List[str]:
    text = text.lower()
    return sorted(
        r for r, keys in REGION_KEYWORDS.items()
        if any(k in text for k in keys)
    )

def count_sentences(text: str) -> int:
    return len([s for s in re.split(r"[.!?]+", text) if s.strip()])

# ============================================================
# CHAT CALL
# ============================================================

def call_llm(prompt: str, max_tokens: int = 2200) -> str:
    api_key = "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"
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set")

    client = OpenAI(
        base_url=OPENROUTER_BASE,
        api_key=api_key,
        default_headers={
            "HTTP-Referer": "https://your-soc-platform.local",
            "X-Title": "Threat Intelligence Pipeline",
        },
    )

    logger.info(f"[LLM] Using OpenRouter model: {OPENROUTER_MODEL}")

    resp = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a senior threat intelligence analyst."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2,
        max_tokens=max_tokens,
        response_format={"type": "json_object"}
    )

    return resp.choices[0].message.content.strip()


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_llm_output(raw: str, item: Dict, source_text: str) -> Dict:
    try:
        data = json.loads(raw)
    except Exception:
        logger.error("[LLM] Invalid JSON returned")
        data = {}

    exec_summary = data.get("exec_summary", "")
    sentence_count = count_sentences(exec_summary)

    if sentence_count < 18 or sentence_count > 20:
        logger.warning(
            f"[LLM] exec_summary sentence count {sentence_count} (expected 18–20)"
        )

    # CVEs
    cves = ensure_list(data.get("cves")) or extract_cves(source_text)
    if not cves:
        threat_type = str(data.get("threat_type", "")).lower()

        if any(k in threat_type for k in ["malware", "ransomware", "apt", "campaign"]):
            cves = ["No CVE – Active Threat Campaign"]
        elif any(k in threat_type for k in ["phishing", "credential"]):
            cves = ["No CVE – Exploitation Technique"]
        else:
            cves = ["No CVE – Vulnerability Not Assigned"]
        if not cves:
            cves = ["No CVE - Threat Activity"]

    # CVSS → Criticality
    cvss_score = extract_cvss_score(source_text + " " + exec_summary)
    criticality = cvss_to_criticality(cvss_score) if cvss_score else (
        data.get("criticality", "MEDIUM").upper()
        if data.get("criticality", "").upper() in VALID_CRITICALITY
        else "MEDIUM"
    )

    # Patch details
    patch_details = ensure_list(data.get("patch_details")) or extract_patch_snippets(source_text)

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
        "sectors": normalize_sectors(data.get("sectors")),
        "regions": normalize_regions(data.get("regions")),
        "recommendations": ensure_list(data.get("recommendations")),
        "patch_details": patch_details,
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
        source_text=source_text,
        prompt=prompt,
        output=raw,
    )

    logger.info(
        f"[TOKENS] input={token_stats['input_tokens']} | "
        f"output={token_stats['output_tokens']} | "
        f"total={token_stats['total_tokens']}"
    )

    result = normalize_llm_output(raw, item, source_text)

    # Attach token stats (optional, but VERY useful)
    result["_llm_tokens"] = token_stats

    return result
