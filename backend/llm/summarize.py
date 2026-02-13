#!/usr/bin/env python3
"""
LLM Recommendation Refiner (STRICT, POST-PROCESS ONLY)

✔ Uses OpenRouter
✔ NO web access beyond OpenRouter
✔ NO hallucination or inference
✔ Recommendations → clean bullet points
✔ Patch details → ONE complete instruction
✔ Deterministic safety checks
✔ Safe fallback to raw content
"""

import os
from typing import List
import requests
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

cfg = read_yaml("config.yaml") or {}
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

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://soc-ai.local",
    "X-Title": "SOC Recommendation Refiner",
}

# ============================================================
# SYSTEM PROMPTS
# ============================================================

RECOMMENDATION_SYSTEM_PROMPT = """
You are a SOC security analyst.

STRICT RULES:
- DO NOT add new recommendations
- DO NOT generalize or add best practices
- ONLY rewrite the provided text
- Preserve technical meaning
- Output bullet points ONLY
""".strip()

PATCH_SYSTEM_PROMPT = """
You are a SOC security analyst.

STRICT RULES FOR PATCH DETAILS:
- DO NOT add new information
- DO NOT summarize away details
- DO NOT truncate
- Preserve ALL versions, CVEs, dates, and vendor instructions
- Return ONE complete patch instruction as a single paragraph
- DO NOT use bullet points
""".strip()

# ============================================================
# PUBLIC API
# ============================================================

def refine_blocks(blocks: List[str], mode: str) -> List[str]:
    """
    mode:
      - 'recommendations' → list of bullet points
      - 'patch_details'   → list with ONE complete instruction
    """
    if not blocks:
        return []

    if mode == "patch_details":
        return _refine_patch_details(blocks)

    return _refine_recommendations(blocks)

# ============================================================
# PATCH DETAILS (CRITICAL PATH)
# ============================================================

def _refine_patch_details(blocks: List[str]) -> List[str]:
    """
    Patch details must be ONE consolidated, complete instruction.
    """
    joined = " ".join(b.strip() for b in blocks if b.strip())

    # Too little content → unsafe to refine
    if len(joined) < 80:
        return blocks

    prompt = f"""
Rewrite the following patch information into ONE clear, complete,
SOC-ready patch instruction.

RULES:
- Do NOT truncate
- Do NOT split into bullets
- Do NOT add information
- Preserve versions, CVEs, dates
- Return ONE paragraph only

INPUT:
{joined}
""".strip()

    try:
        refined = _call_llm(prompt, PATCH_SYSTEM_PROMPT)

        # ---------------- HARD SAFETY CHECKS ---------------- #

        # Empty or collapsed output
        if not refined or len(refined) < int(len(joined) * 0.6):
            logger.warning("[LLM] Patch refinement rejected (partial output)")
            return blocks

        # Semantic integrity check
        KEY_TERMS = ("version", "update", "upgrade", "patch", "fixed", "cve")
        low_joined = joined.lower()
        low_refined = refined.lower()

        if any(k in low_joined and k not in low_refined for k in KEY_TERMS):
            logger.warning("[LLM] Patch refinement rejected (lost key terms)")
            return blocks

        logger.debug(
            "[LLM] Patch refined successfully",
            extra={
                "original_len": len(joined),
                "refined_len": len(refined),
            }
        )

        return [refined.strip()]

    except Exception:
        logger.error("[LLM] Patch refinement failed", exc_info=True)
        return blocks

# ============================================================
# RECOMMENDATIONS
# ============================================================

def _refine_recommendations(blocks: List[str]) -> List[str]:
    joined = "\n".join(f"- {b.strip()}" for b in blocks if b.strip())

    prompt = f"""
Rewrite the following recommendations into clean, SOC-ready bullet points.

RULES:
- Preserve meaning
- Do NOT add new actions
- Output bullet points ONLY

INPUT:
{joined}
""".strip()

    try:
        content = _call_llm(prompt, RECOMMENDATION_SYSTEM_PROMPT)

        bullets = [
            line.lstrip("-• ").strip()
            for line in content.splitlines()
            if line.strip().startswith(("-", "•"))
        ]

        # HARD NORMALIZATION — prevent junk bullets
        bullets = [b for b in bullets if len(b) >= 20]

        if bullets:
            logger.debug(
                "[LLM] Recommendations refined",
                extra={"count": len(bullets)}
            )
            return bullets

        return blocks

    except Exception:
        logger.error("[LLM] Recommendation refinement failed", exc_info=True)
        return blocks

# ============================================================
# LLM CALL (SHARED)
# ============================================================

def _call_llm(user_prompt: str, system_prompt: str) -> str:
    payload = {
        "model": OPENROUTER_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    response = requests.post(
        f"{OPENROUTER_BASE}/chat/completions",
        headers=HEADERS,
        json=payload,
        timeout=25,
    )

    response.raise_for_status()
    data = response.json()

    return (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )