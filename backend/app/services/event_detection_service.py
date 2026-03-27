"""
AI event detection service.

Primary provider: Google Gemini.
Fallback provider: Groq (llama-3.3-70b-versatile) — activated automatically
when Gemini returns quota-exhausted or rate-limit errors.

Enforces deterministic JSON output and validates with Pydantic.
"""

import asyncio
import json
import logging
import re
from typing import Any

import google.generativeai as genai
from groq import Groq

from app.core.config import get_settings
from app.schemas.event import EventDetectionResult

logger = logging.getLogger(__name__)

DETECTION_TIMEOUT_SECONDS = 10.0

SYSTEM_PROMPT = """You are a supply chain disruption intelligence analyst.
Analyze the article and return JSON ONLY (no markdown, no explanation, no code fences).

Required output schema:
{
  "event_type": "",
  "location": "",
  "industry": "",
  "severity": "",
  "summary": "",
  "confidence_score": 0.0
}

Rules:
- severity must be exactly one of: low, medium, high, critical
- summary must be a meaningful 1-2 sentence explanation
- confidence_score must be a float between 0.0 and 1.0
- all string fields must be non-empty
- if no disruption is present, return {"event_type": "none"}
"""

SUMMARY_REGEN_PROMPT = """
Your previous output was missing a meaningful summary.
Return JSON ONLY with all required fields and a concise 1-2 sentence summary.
"""


def _configure_gemini() -> genai.GenerativeModel:
    """Configures and returns a Gemini GenerativeModel instance."""
    settings = get_settings()
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(settings.GEMINI_MODEL)


def _clean_response(raw_text: str) -> str:
    """Strips markdown code fences and extraneous whitespace from model output."""
    text = raw_text.strip()
    pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    return text


def _is_quota_error(exc: Exception) -> bool:
    """Returns True if the exception signals a Gemini quota or rate-limit exhaustion."""
    error_str = str(exc).lower()
    return any(
        token in error_str
        for token in ("429", "resource_exhausted", "quota", "requestsperday", "dailylimit")
    )


def _is_rate_limit_error(exc: Exception) -> bool:
    """Returns True for transient rate-limit errors worth retrying."""
    return _is_quota_error(exc)


def _fallback_event() -> EventDetectionResult:
    """Fallback event used when all providers fail or time out."""
    return EventDetectionResult(
        event_type="unknown",
        location="unknown",
        country="unknown",
        industry="unknown",
        severity="low",
        confidence_score=0.5,
        summary=(
            "Automated extraction failed due to AI unavailability. "
            "Event captured with fallback defaults for downstream continuity."
        ),
    )


def _coerce_confidence(parsed: dict[str, Any]) -> None:
    """Ensures confidence_score exists and stays in [0,1]."""
    raw = parsed.get("confidence_score")
    if raw is None:
        parsed["confidence_score"] = 0.5
        return
    try:
        value = float(raw)
    except (TypeError, ValueError):
        parsed["confidence_score"] = 0.5
        return
    parsed["confidence_score"] = max(0.0, min(1.0, value))


def _parse_ai_response(raw_text: str) -> dict[str, Any] | None:
    """Cleans and parses a JSON response from any AI provider. Returns None on failure."""
    cleaned = _clean_response(raw_text)
    try:
        parsed = json.loads(cleaned)
        _coerce_confidence(parsed)
        return parsed
    except (json.JSONDecodeError, ValueError):
        return None


async def _generate_content_with_timeout(
    model: genai.GenerativeModel,
    prompt: str,
    timeout_seconds: float,
) -> str:
    """Runs Gemini generation in a worker thread with a timeout."""
    response = await asyncio.wait_for(
        asyncio.to_thread(
            model.generate_content,
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=500,
            ),
        ),
        timeout=timeout_seconds,
    )
    return response.text or ""


async def _detect_with_groq(article_text: str) -> EventDetectionResult | None:
    """
    Fallback event detection using Groq API (llama-3.3-70b-versatile).

    Called automatically when Gemini quota is exhausted.

    Args:
        article_text: Raw news article text to classify.

    Returns:
        EventDetectionResult if a valid event was extracted, None otherwise.
    """
    settings = get_settings()

    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not configured — cannot use Groq fallback.")
        return _fallback_event()

    logger.info("Using Groq (%s) as fallback provider.", settings.GROQ_MODEL)

    client = Groq(api_key=settings.GROQ_API_KEY)

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.chat.completions.create,
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Analyze this article for supply chain disruptions:\n\n"
                            f"{article_text[:4000]}"
                        ),
                    },
                ],
                temperature=0.1,
                max_tokens=500,
            ),
            timeout=DETECTION_TIMEOUT_SECONDS,
        )

        raw_text = response.choices[0].message.content or ""
        if not raw_text:
            logger.warning("Groq returned empty response.")
            return _fallback_event()

        parsed = _parse_ai_response(raw_text)
        if parsed is None:
            logger.warning("Groq returned invalid JSON.")
            return _fallback_event()

        if parsed.get("event_type") == "none":
            logger.debug("Groq classified article as non-disruption.")
            return None

        result = EventDetectionResult.model_validate(parsed)
        logger.info(
            "Groq detected: type=%s, severity=%s, location=%s",
            result.event_type, result.severity, result.location,
        )
        return result

    except asyncio.TimeoutError:
        logger.warning("Groq detection timed out after %.1fs.", DETECTION_TIMEOUT_SECONDS)
        return _fallback_event()
    except Exception as exc:
        logger.warning("Groq detection failed: %s: %s", type(exc).__name__, str(exc))
        return _fallback_event()


async def detect_event(article_text: str) -> EventDetectionResult | None:
    """
    Extracts a structured disruption event from article text.

    Tries Google Gemini first. If Gemini's quota is exhausted or returns
    a rate-limit error, automatically falls back to Groq.

    Args:
        article_text: Combined title + description + content of the article.

    Returns:
        EventDetectionResult if a valid event was extracted, None otherwise.
    """
    model = _configure_gemini()

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Analyze this article for supply chain disruptions:\n\n"
        f"{article_text[:4000]}"
    )

    try:
        raw_content = await _generate_content_with_timeout(
            model=model,
            prompt=prompt,
            timeout_seconds=DETECTION_TIMEOUT_SECONDS,
        )

        if not raw_content:
            logger.warning("Gemini returned empty response — trying Groq fallback.")
            return await _detect_with_groq(article_text)

        parsed = _parse_ai_response(raw_content)
        if parsed is None:
            logger.warning("Gemini returned invalid JSON — trying Groq fallback.")
            return await _detect_with_groq(article_text)

        if parsed.get("event_type") == "none":
            logger.debug("Article classified as non-disruption event.")
            return None

        # Retry summary generation if missing
        if not str(parsed.get("summary", "")).strip():
            logger.warning("Gemini response missing summary; requesting one regeneration.")
            regen_prompt = f"{prompt}\n\n{SUMMARY_REGEN_PROMPT}"
            regen_content = await _generate_content_with_timeout(
                model=model,
                prompt=regen_prompt,
                timeout_seconds=DETECTION_TIMEOUT_SECONDS,
            )
            if regen_content:
                regen_parsed = _parse_ai_response(regen_content)
                if regen_parsed and str(regen_parsed.get("summary", "")).strip():
                    parsed = regen_parsed
                else:
                    return await _detect_with_groq(article_text)
            else:
                return await _detect_with_groq(article_text)

        result = EventDetectionResult.model_validate(parsed)
        logger.info(
            "Gemini detected: type=%s, severity=%s, location=%s",
            result.event_type, result.severity, result.location,
        )
        return result

    except asyncio.TimeoutError:
        logger.warning(
            "Gemini detection timed out after %.1fs — trying Groq fallback.",
            DETECTION_TIMEOUT_SECONDS,
        )
        return await _detect_with_groq(article_text)

    except Exception as exc:
        if _is_quota_error(exc):
            logger.warning(
                "Gemini quota/rate-limit hit — switching to Groq fallback. (%s)", str(exc)[:120]
            )
            return await _detect_with_groq(article_text)

        logger.warning(
            "Gemini detection failed (%s) — trying Groq fallback.", type(exc).__name__
        )
        return await _detect_with_groq(article_text)
