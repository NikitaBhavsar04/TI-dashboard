# llm/mbc.py

import os
import json
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv

from utils.common import logger, read_yaml

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

# Load environment variables from project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(project_root, '.env'))

# ============================================================
# CONFIG
# ============================================================

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

cfg = read_yaml("config.yaml")
or_cfg = cfg.get("openrouter", {})
# Allow env override to enable OpenRouter even if config.yaml marks it disabled
env_enabled = os.getenv("OPENROUTER_ENABLED")
enabled = (
    (env_enabled.lower() in {"1", "true", "yes", "on"}) if env_enabled else or_cfg.get("enabled", False)
)

if not enabled:
    raise RuntimeError("OpenRouter is disabled in config.yaml")

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL") or or_cfg.get("model")
API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_MODEL or not API_KEY:
    raise RuntimeError("OpenRouter model or API key missing")

# ============================================================
# CONTROLLED MBC VOCABULARY (STRICT)
# ============================================================

ALLOWED_MBC_BEHAVIORS = {
    "Credential Harvesting",
    "Command and Control Communication",
    "Data Exfiltration",
    "Persistence Mechanism",
    "Command Execution",
    "Defense Evasion",
    "System Discovery",
    "Lateral Movement Capability",
}

ALLOWED_CONFIDENCE = {"High", "Medium", "Low"}

MAX_BEHAVIORS = 5
MIN_SUMMARY_LEN = 200

# ============================================================
# PROMPT
# ============================================================

def build_prompt(
    *,
    title: str,
    threat_type: str,
    exec_summary: str,
    mitre: List[Dict],
) -> str:
    mitre_context = []
    for t in mitre:
        tid = t.get("techniqueId")
        subs = t.get("subtechniques", [])
        if tid:
            line = tid
            if subs:
                line += f" (sub-techniques: {', '.join(subs)})"
            mitre_context.append(line)

    return f"""
You are a senior SOC malware analyst.

Your task is to extract **Malware Behavior Catalog (MBC)** behaviors.

STRICT RULES:
- Use ONLY behaviors from the allowed list below
- Focus ONLY on observable malware behavior
- Do NOT infer attacker intent
- Do NOT invent behaviors
- Evidence MUST be copied verbatim from the executive summary
- Objective must describe WHAT the behavior achieves (max 6 words)
- Maximum {MAX_BEHAVIORS} behaviors
- If no malware behavior is present, return an empty list []

ALLOWED MBC BEHAVIORS:
{", ".join(sorted(ALLOWED_MBC_BEHAVIORS))}

=====================
CONTEXT
=====================
Title: {title}
Threat Type: {threat_type}

Observed MITRE Context (reference only):
{chr(10).join(mitre_context) or "None"}

Executive Summary:
{exec_summary}

=====================
OUTPUT FORMAT (JSON ONLY)
=====================

{{
  "mbc": [
    {{
      "behavior": "",
      "objective": "",
      "confidence": "High | Medium | Low",
      "evidence": ""
    }}
  ]
}}

Return ONLY valid JSON.
""".strip()

# ============================================================
# LLM CALL
# ============================================================

def call_llm(prompt: str) -> Dict:
    import httpx
    import os
    
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
            api_key=API_KEY,
            http_client=http_client,
        )
        
        return client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": "You are a SOC malware behavior analyst."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
    
    if is_development:
        logger.info("[MBC] Development environment detected, SSL verification disabled")
        
    try:
        resp = make_request(verify_ssl=ssl_verify)
        return json.loads(resp.choices[0].message.content.strip())
        
    except Exception as e:
        error_msg = str(e).lower()
        
        # Handle rate limiting specifically
        if '429' in error_msg or 'rate' in error_msg:
            logger.warning(f"[MBC] Rate limited, skipping MBC analysis: {e}")
            return {"mbc": []}  # Return empty structure instead of failing
        
        # Always try SSL fallback for any SSL-related error
        if 'ssl' in error_msg or 'certificate' in error_msg or 'connection' in error_msg:
            logger.warning(f"[MBC] SSL/Connection error detected, retrying without SSL verification: {e}")
            try:
                resp = make_request(verify_ssl=False)
                return json.loads(resp.choices[0].message.content.strip())
            except Exception as retry_e:
                logger.error(f"[MBC] Failed even without SSL verification: {retry_e}")
                return {"mbc": []}
        else:
            logger.error(f"[MBC] Request failed: {e}")
            return {"mbc": []}

# ============================================================
# PUBLIC API
# ============================================================

def extract_mbc(
    *,
    title: str,
    threat_type: str,
    exec_summary: str,
    mitre: List[Dict],
) -> List[Dict]:

    if not exec_summary or len(exec_summary) < MIN_SUMMARY_LEN:
        logger.warning(f"[MBC] Executive summary too short ({len(exec_summary)} chars), skipping")
        return []

    logger.info(f"[MBC] Analyzing: title='{title[:50]}...', threat_type='{threat_type}'")
    
    try:
        result = call_llm(
            build_prompt(
                title=title,
                threat_type=threat_type,
                exec_summary=exec_summary,
                mitre=mitre,
            )
        )

        mbc = result.get("mbc", [])
        if not isinstance(mbc, list):
            logger.warning(f"[MBC] Expected list, got {type(mbc)}")
            return []

        logger.info(f"[MBC] LLM returned {len(mbc)} potential behaviors")
        validated = []

        for item in mbc:
            if not isinstance(item, dict):
                logger.warning(f"[MBC] Skipping non-dict item: {item}")
                continue

            behavior = item.get("behavior")
            evidence = item.get("evidence", "")
            confidence = item.get("confidence")

            if behavior not in ALLOWED_MBC_BEHAVIORS:
                logger.warning(f"[MBC] Invalid behavior '{behavior}', skipping")
                continue

            if confidence not in ALLOWED_CONFIDENCE:
                logger.warning(f"[MBC] Invalid confidence '{confidence}', skipping")
                continue

            # Evidence must be verbatim from executive summary
            if not evidence or evidence not in exec_summary:
                logger.warning(f"[MBC] Evidence not found in summary: '{evidence[:50]}...', skipping")
                continue

            validated.append(item)
            logger.info(f"[MBC] Validated behavior: {behavior} ({confidence})")

        logger.info(f"[MBC] Final result: {len(validated)} validated behaviors")
        return validated[:MAX_BEHAVIORS]

    except Exception as e:
        logger.error(f"[MBC] Extraction failed: {str(e)}")
        return []