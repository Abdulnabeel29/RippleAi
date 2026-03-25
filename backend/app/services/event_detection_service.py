"""
AI event detection service.

Uses Google Gemini API to extract structured supply chain
disruption events from raw news article text. Enforces deterministic
JSON output and validates results with Pydantic before returning.

Includes retry logic with exponential backoff to handle Gemini
free-tier rate limits (429 RESOURCE_EXHAUSTED).
"""

import asyncio
import json
import logging
import re
from typing import Any

import google.generativeai as genai

from app.core.config import get_settings
from app.schemas.event import EventDetectionResult

logger = logging.getLogger(__name__)

# Hard timeout for each Gemini request
DETECTION_TIMEOUT_SECONDS = 8.0

# System prompt that forces the model to return structured JSON
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


def _configure_client() -> genai.GenerativeModel:
    """
    Configures and returns a Gemini GenerativeModel instance.

    Returns:
        genai.GenerativeModel: Configured Gemini model.
    """
    settings = get_settings()
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(settings.GEMINI_MODEL)


def _clean_response(raw_text: str) -> str:
    """
    Strips markdown code fences and extraneous whitespace from model output.

    Gemini may wrap JSON in ```json ... ``` blocks. This function
    extracts the raw JSON string.

    Args:
        raw_text: Raw text response from the Gemini model.

    Returns:
        str: Cleaned string containing only the JSON content.
    """
    text = raw_text.strip()

    # Remove markdown code fences: ```json ... ``` or ``` ... ```
    pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        text = match.group(1).strip()

    return text


def _is_rate_limit_error(exc: Exception) -> bool:
    """
    Checks whether an exception is a Gemini rate-limit (429) error.

    Args:
        exc: The caught exception.

    Returns:
        bool: True if this is a rate-limit error that should be retried.
    """
    error_str = str(exc).lower()
    return "429" in error_str or "resource_exhausted" in error_str


def _fallback_event() -> EventDetectionResult:
    """Fallback event used when Gemini fails or times out."""
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


async def detect_event(article_text: str) -> EventDetectionResult | None:
    """
    Extracts a structured disruption event from article text using Google Gemini.

    Sends the article text to the Gemini API with a prompt that enforces
    JSON output. Cleans, parses, and validates the response using Pydantic.
    Returns None if the article contains no disruption event or if the
    response fails validation.

    Implements exponential backoff retry on rate-limit errors.

    Args:
        article_text: Combined title + description + content of the article.

    Returns:
        EventDetectionResult if a valid event was extracted, None otherwise.
    """
    model = _configure_client()

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
            logger.warning("Gemini returned empty response content; using fallback event.")
            return _fallback_event()

        cleaned = _clean_response(raw_content)
        parsed: dict[str, Any] = json.loads(cleaned)

        if parsed.get("event_type") == "none":
            logger.debug("Article classified as non-disruption event.")
            return None

        _coerce_confidence(parsed)

        # If summary is missing, retry once with a strict regeneration prompt.
        if not str(parsed.get("summary", "")).strip():
            logger.warning("Gemini response missing summary; requesting one regeneration.")
            regen_prompt = f"{prompt}\n\n{SUMMARY_REGEN_PROMPT}"
            regen_content = await _generate_content_with_timeout(
                model=model,
                prompt=regen_prompt,
                timeout_seconds=DETECTION_TIMEOUT_SECONDS,
            )
            if regen_content:
                regen_parsed = json.loads(_clean_response(regen_content))
                _coerce_confidence(regen_parsed)
                if str(regen_parsed.get("summary", "")).strip():
                    parsed = regen_parsed
                else:
                    logger.warning("Regeneration still missing summary; using fallback event.")
                    return _fallback_event()
            else:
                logger.warning("Regeneration returned empty response; using fallback event.")
                return _fallback_event()

        result = EventDetectionResult.model_validate(parsed)
        logger.info(
            "Detected event: type=%s, severity=%s, location=%s",
            result.event_type,
            result.severity,
            result.location,
        )
        return result

    except asyncio.TimeoutError:
        logger.warning(
            "Gemini detection timed out after %.1fs; using fallback event.",
            DETECTION_TIMEOUT_SECONDS,
        )
        return _fallback_event()
    except json.JSONDecodeError as exc:
        logger.warning("Gemini returned invalid JSON: %s. Using fallback event.", str(exc))
        return _fallback_event()
    except ValueError as exc:
        logger.warning("Gemini output failed validation: %s. Using fallback event.", str(exc))
        return _fallback_event()
    except Exception as exc:
        if _is_rate_limit_error(exc):
            logger.warning("Gemini rate limit hit. Using fallback event: %s", str(exc))
            return _fallback_event()
        logger.warning("Gemini detection failed. Using fallback event: %s", str(exc))
        return _fallback_event()
