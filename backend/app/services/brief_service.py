"""
Intelligence Brief Service.

Aggregates supply chain event and prediction data across a given time
range, computes threat metrics, and uses Gemini to synthesize an
executive intelligence narrative for the Generate Brief feature.
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Literal

import google.generativeai as genai
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.event import Event
from app.models.prediction import Prediction

logger = logging.getLogger(__name__)

TimeRange = Literal["today", "week", "month"]


def _window_start(time_range: TimeRange) -> tuple[datetime, datetime]:
    """
    Returns the UTC start datetime for the requested time range and the previous equivalent time range.

    Args:
        time_range: One of 'today', 'week', 'month'.

    Returns:
        tuple[datetime, datetime]: (current_window_start, previous_window_start)
    """
    now = datetime.now(timezone.utc)
    if time_range == "today":
        curr = now - timedelta(hours=24)
        return curr, curr - timedelta(hours=24)
    if time_range == "week":
        curr = now - timedelta(days=7)
        return curr, curr - timedelta(days=7)
    curr = now - timedelta(days=30)
    return curr, curr - timedelta(days=30)


def _threat_level(critical: int, high: int, total: int) -> str:
    """
    Computes an overall threat level from event severity counts.

    Args:
        critical: Number of critical-severity events.
        high: Number of high-severity events.
        total: Total event count.

    Returns:
        str: 'CRITICAL', 'ELEVATED', or 'STABLE'.
    """
    if total == 0:
        return "STABLE"
    critical_ratio = (critical + high) / total
    if critical > 0 or critical_ratio >= 0.4:
        return "CRITICAL"
    if critical_ratio >= 0.15:
        return "ELEVATED"
    return "STABLE"


async def _generate_narrative(
    time_range: TimeRange,
    metrics: dict,
    top_events: list,
    top_predictions: list,
    geo_exposure: list,
    industry_exposure: list,
) -> dict:
    """
    Calls Gemini to write a concise, analyst-style executive narrative and 
    strategic recommendations based on the aggregated brief data.

    Returns:
        dict: Parsed AI-generated JSON response.
    """
    settings = get_settings()
    window_label = {"today": "24 hours", "week": "7 days", "month": "30 days"}[time_range]

    prompt = f"""
You are a Senior Supply Chain Intelligence Analyst writing a classified executive brief.

Based on the provided data, generate a strategic intelligence assessment.
Your response MUST be a valid JSON object matching exactly this schema:
{{
  "executive_summary": "A concise, factual narrative (4-6 sentences) summarising the landscape for the past {window_label}. Use precise language, reference actual numbers, no bullets. Write in flowing prose as a seasoned analyst would.",
  "recommended_actions": [
    {{
      "title": "Short actionable title (e.g. Reroute Shipments)",
      "description": "Detailed reasoning and instruction based on the data",
      "priority": "critical" | "high" | "medium"
    }}
  ]
}}
Ensure exactly 3 recommended actions.

DATA:
- Total disruptions detected: {metrics['total_events']}
- Critical/High severity: {metrics['critical_events']}
- Active AI predictions: {metrics['active_predictions']}
- Countries affected: {metrics['countries_affected']}
- Industries at risk: {metrics['industries_affected']}
- Threat Level: {metrics['threat_level']}
- Top disruption types: {', '.join(e['event_type'] for e in top_events[:3]) if top_events else 'None'}
- Top affected regions: {', '.join(g['country'] for g in geo_exposure[:3]) if geo_exposure else 'None'}
- Most exposed industries: {', '.join(i['industry'] for i in industry_exposure[:3]) if industry_exposure else 'None'}
- Top predictions (highest probability): {', '.join(f"{p['event_type']} in {p['location']} ({int(p['probability']*100)}%)" for p in top_predictions[:2]) if top_predictions else 'None'}
"""

    import asyncio
    import json
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = await asyncio.wait_for(
            model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
            ), 
            timeout=10.0
        )
        return json.loads((response.text or "").strip())
    except Exception as e:
        logger.warning("Gemini narrative generation failed or timed out, trying Groq: %s", e)

    # Fallback to Groq
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        chat_coro = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"}
        )
        chat = await asyncio.wait_for(chat_coro, timeout=10.0)
        return json.loads((chat.choices[0].message.content or "").strip())
    except Exception as e2:
        logger.error("Groq narrative fallback also failed or timed out: %s", e2)

    return {
        "executive_summary": (
            f"Over the past {window_label}, RippleAI detected {metrics['total_events']} supply chain "
            f"disruption events across {metrics['countries_affected']} countries and "
            f"{metrics['industries_affected']} industries. {metrics['critical_events']} events were "
            f"classified as critical or high severity. The predictive engine has flagged "
            f"{metrics['active_predictions']} active risk forecasts. Threat level: {metrics['threat_level']}."
        ),
        "recommended_actions": [
            {
                "title": "Maintain Baseline Operations",
                "description": "System encountered degradation during intelligence synthesis. No anomalous interventions required at this time.",
                "priority": "medium"
            }
        ]
    }


class BriefService:
    """
    Orchestrates data aggregation and AI narrative generation
    for the intelligence brief endpoint.
    """

    async def generate_brief(self, time_range: TimeRange, db: AsyncSession) -> dict:
        """
        Generates a full intelligence brief for the given time range.

        Queries events and predictions, computes all metrics, calls Gemini
        for the executive narrative, and returns a structured brief dict.

        Args:
            time_range: 'today', 'week', or 'month'.
            db: Async database session.

        Returns:
            dict: Complete brief payload with all sections.
        """
        window, prev_window = _window_start(time_range)

        # ── Query events in window ───────────────────────────────────────────
        events_result = await db.execute(
            select(Event).where(Event.detected_at >= window)
        )
        events = events_result.scalars().all()

        # ── Query previous window events for trends ──────────────────────────
        prev_events_result = await db.execute(
            select(Event).where(Event.detected_at >= prev_window, Event.detected_at < window)
        )
        prev_events = prev_events_result.scalars().all()

        # ── Query all active predictions ────────────────────────────────────
        predictions_result = await db.execute(
            select(Prediction).order_by(Prediction.probability.desc())
        )
        predictions = predictions_result.scalars().all()

        # ── Severity breakdown ───────────────────────────────────────────────
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for e in events:
            sev = (e.severity or "low").lower()
            if sev in severity_counts:
                severity_counts[sev] += 1
            else:
                severity_counts["low"] += 1

        total_events = len(events)
        critical_events = severity_counts["critical"] + severity_counts["high"]
        threat_level = _threat_level(severity_counts["critical"], severity_counts["high"], total_events)

        prev_total_events = len(prev_events)
        prev_critical_events = sum(1 for e in prev_events if (e.severity or "low").lower() in ("critical", "high"))
        
        total_events_trend = ((total_events - prev_total_events) / prev_total_events * 100) if prev_total_events > 0 else 0
        critical_events_trend = ((critical_events - prev_critical_events) / prev_critical_events * 100) if prev_critical_events > 0 else 0

        # ── Geographic exposure ──────────────────────────────────────────────
        country_counts: dict[str, int] = {}
        country_severity: dict[str, str] = {}
        for e in events:
            country = (e.country or e.location or "Unknown").strip()
            if not country or country.lower() == "unknown":
                continue
            country_counts[country] = country_counts.get(country, 0) + 1
            # Track worst severity per country
            sev = (e.severity or "low").lower()
            existing = country_severity.get(country, "low")
            sev_rank = {"critical": 3, "high": 2, "medium": 1, "low": 0}
            if sev_rank.get(sev, 0) > sev_rank.get(existing, 0):
                country_severity[country] = sev

        geo_exposure = [
            {"country": c, "count": n, "severity": country_severity.get(c, "low")}
            for c, n in sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        ]

        # ── Industry exposure ────────────────────────────────────────────────
        industry_counts: dict[str, int] = {}
        for e in events:
            ind = (e.industry or "Unknown").strip()
            if not ind or ind.lower() == "unknown":
                continue
            industry_counts[ind] = industry_counts.get(ind, 0) + 1

        industry_exposure = [
            {"industry": i, "count": n}
            for i, n in sorted(industry_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        ]

        # ── Event type breakdown ─────────────────────────────────────────────
        type_counts: dict[str, int] = {}
        for e in events:
            et = (e.event_type or "unknown").lower().strip()
            type_counts[et] = type_counts.get(et, 0) + 1

        event_type_breakdown = [
            {"event_type": t, "count": n}
            for t, n in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:6]
        ]

        # ── Top events (severity → recency sorted) ───────────────────────────
        sev_rank = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        sorted_events = sorted(
            events,
            key=lambda e: (sev_rank.get((e.severity or "low").lower(), 0), e.detected_at or datetime.min),
            reverse=True
        )
        top_events = [
            {
                "id": str(e.id),
                "event_type": e.event_type,
                "location": e.location,
                "country": e.country,
                "industry": e.industry,
                "severity": e.severity,
                "summary": e.summary,
                "detected_at": e.detected_at.isoformat() if e.detected_at else None,
            }
            for e in sorted_events[:5]
        ]

        # ── Top predictions ──────────────────────────────────────────────────
        top_predictions = [
            {
                "event_type": p.event_type,
                "location": p.location,
                "probability": p.probability,
                "risk_level": p.risk_level,
                "expected_delay_days": p.expected_delay_days,
                "why": p.why,
            }
            for p in predictions[:5]
        ]

        # ── Metrics payload ──────────────────────────────────────────────────
        metrics = {
            "total_events": total_events,
            "total_events_trend": round(total_events_trend, 1),
            "critical_events": critical_events,
            "critical_events_trend": round(critical_events_trend, 1),
            "active_predictions": len(predictions),
            "countries_affected": len(country_counts),
            "industries_affected": len(industry_counts),
            "severity_breakdown": severity_counts,
            "event_type_breakdown": event_type_breakdown,
            "threat_level": threat_level,
        }

        # ── AI Narrative & Recommendations ───────────────────────────────────
        logger.info("Generating intelligence brief narrative for time_range=%s", time_range)
        ai_response = await _generate_narrative(
            time_range=time_range,
            metrics=metrics,
            top_events=top_events,
            top_predictions=top_predictions,
            geo_exposure=geo_exposure,
            industry_exposure=industry_exposure,
        )

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "time_range": time_range,
            "threat_level": threat_level,
            "executive_summary": ai_response.get("executive_summary", ""),
            "recommended_actions": ai_response.get("recommended_actions", []),
            "metrics": metrics,
            "top_events": top_events,
            "top_predictions": top_predictions,
            "geographic_exposure": geo_exposure,
            "industry_exposure": industry_exposure,
        }


brief_service = BriefService()
