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

# This will search for .env in current dir, then parent dirs
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
    client = OpenAI(
        base_url=OPENROUTER_BASE,
        api_key=API_KEY,
    )

    resp = client.chat.completions.create(
        model=OPENROUTER_MODEL,
        messages=[
            {"role": "system", "content": "You are a SOC malware behavior analyst."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=600,
        response_format={"type": "json_object"},
    )

    return json.loads(resp.choices[0].message.content.strip())

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
        return []

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
            return []

        validated = []

        for item in mbc:
            if not isinstance(item, dict):
                continue

            behavior = item.get("behavior")
            evidence = item.get("evidence", "")
            confidence = item.get("confidence")

            if behavior not in ALLOWED_MBC_BEHAVIORS:
                continue

            if confidence not in ALLOWED_CONFIDENCE:
                continue

            # Evidence must be verbatim from executive summary
            if not evidence or evidence not in exec_summary:
                continue

            validated.append(item)

        return validated[:MAX_BEHAVIORS]

    except Exception as e:
        logger.warning(
            "[MBC] Extraction failed",
            extra={"title": title, "error": str(e)}
        )
        return []