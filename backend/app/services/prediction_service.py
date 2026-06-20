"""
Predictive Intelligence Service.

Forecasting engine to assign risk probabilities and expected delays
based on statistically analyzing historical disruption events.
"""

import logging
from typing import List

from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

import json
import asyncio
from datetime import datetime, timedelta, timezone
from app.models.event import Event
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionItem
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)


def _get_base_delay(event_type: str) -> int:
    """
    Returns baseline recovery delay (in days) according to event type severity.
    """
    type_map = {
        "strike": 14,
        "fire": 30,
        "factory_fire": 30,
        "shortage": 45,
        "weather": 7,
        "hurricane": 21,
        "disruption": 10
    }
    return type_map.get(event_type.lower(), 7)  # Fallback to 7 days


class PredictionService:
    """
    Service for calculating statistical future disruption risks.
    """

    async def update_predictions(self, db: AsyncSession) -> None:
        """
        Scans historical events from the last 30 days, applies time-decay weighting,
        extracts predictive indicators with normalized probabilities, and saves them
        to the database.

        Args:
            db: Async database session.
        """
        # ── Event type normalization map ─────────────────────────────────────
        # Collapses semantically identical LLM-generated labels into canonical types
        _CANONICAL_TYPE_MAP = {
            # Cyber
            "cyber attack": "cyber attack",
            "cyber-attack": "cyber attack",
            "cyberattack": "cyber attack",
            "cybersecurity threat": "cyber attack",
            "cybersecurity incident": "cyber attack",
            "cybersecurity breach": "cyber attack",
            "cyber vulnerability": "cyber attack",
            "supply chain attack": "cyber attack",
            "supply chain compromise": "cyber attack",
            "data breach": "cyber attack",
            "data leak": "cyber attack",
            # Conflict / War
            "war": "conflict",
            "military conflict": "conflict",
            "geopolitical conflict": "conflict",
            "geopolitical tensions": "conflict",
            "geopolitical tension": "conflict",
            "geopolitical instability": "conflict",
            "geopolitical": "conflict",
            "blockade": "conflict",
            "blockage": "conflict",
            # Trade
            "trade policy change": "trade disruption",
            "trade policy": "trade disruption",
            "trade restriction": "trade disruption",
            "trade tension": "trade disruption",
            "trade dispute": "trade disruption",
            "trade regulation": "trade disruption",
            "export control": "trade disruption",
            "export restriction": "trade disruption",
            "tariff": "trade disruption",
            "tariff refund": "trade disruption",
            # Labor
            "labor strike": "labor dispute",
            "labor shortage": "labor dispute",
            "labor dispute": "labor dispute",
            "protest": "labor dispute",
            # Regulatory
            "regulatory": "regulatory change",
            "regulatory change": "regulatory change",
            "regulatory update": "regulatory change",
            "regulatory disruption": "regulatory change",
            "regulatory dispute": "regulatory change",
            "regulatory clarification": "regulatory change",
            "enforcement action": "regulatory change",
            # Supply shortages
            "shortage": "supply shortage",
            "supply shortage": "supply shortage",
            "supply disruption": "supply shortage",
            "supply chain disruption": "supply shortage",
            "supply chain delay": "supply shortage",
            "component shortage": "supply shortage",
            "inventory shortage": "supply shortage",
            "raw material shortage": "supply shortage",
            "medicine shortage": "supply shortage",
            "fuel shortage": "supply shortage",
            "gas shortage": "supply shortage",
            # Shipping
            "maritime disruption": "shipping disruption",
            "shipping disruption": "shipping disruption",
            "shipping route disruption": "shipping disruption",
            "shipping lane disruption": "shipping disruption",
            "port congestion": "shipping disruption",
            "logistics disruption": "shipping disruption",
            "customs delay": "shipping disruption",
            "railway disruption": "shipping disruption",
            # Price / Inflation
            "price increase": "price shock",
            "inflation": "price shock",
            "energy price shock": "price shock",
            "energy price increase": "price shock",
            "fuel price increase": "price shock",
            "fuel surcharge": "price shock",
            "surcharge": "price shock",
            "surcharge implementation": "price shock",
        }

        def _normalize_type(raw: str) -> str:
            return _CANONICAL_TYPE_MAP.get(raw.lower().strip(), raw.lower().strip())

        try:
            # 30-day time window
            now = datetime.now(timezone.utc)
            window_start = now - timedelta(days=30)

            from app.core.config import get_settings
            settings = get_settings()
            is_sqlite = settings.DATABASE_URL.startswith("sqlite")
            if is_sqlite:
                window_start = window_start.replace(tzinfo=None)
                now_compare = now.replace(tzinfo=None)
            else:
                now_compare = now

            # Query events within the 30-day window
            result = await db.execute(select(Event).where(Event.detected_at >= window_start))
            events = result.scalars().all()

            if not events:
                logger.info("No events in the last 30 days — skipping prediction update.")
                return

            # ── Aggregate weights by normalized (event_type, location) ───────
            topology_weights: dict = {}

            for event in events:
                raw_type = (event.event_type or "").strip()
                loc = (event.location or "").strip()

                # Filter out noise
                if not raw_type or raw_type.lower() in ["unknown", "noise", ""] \
                        or not loc or loc.lower() == "unknown":
                    continue

                norm_type = _normalize_type(raw_type)
                key = (norm_type, loc.lower())

                evt_dt = event.detected_at
                if evt_dt.tzinfo is None and now_compare.tzinfo is not None:
                    evt_dt = evt_dt.replace(tzinfo=timezone.utc)
                elif evt_dt.tzinfo is not None and now_compare.tzinfo is None:
                    evt_dt = evt_dt.replace(tzinfo=None)

                days_since = max(0.0, (now_compare - evt_dt).total_seconds() / 86400)
                weight = 1.0 / (1.0 + days_since)

                if key not in topology_weights:
                    topology_weights[key] = {
                        "weight_sum": 0.0,
                        "event_type": norm_type,   # canonical display name
                        "location": event.location, # preserve original casing
                        "max_severity": event.severity,
                        "count": 0,
                    }
                topology_weights[key]["weight_sum"] += weight
                topology_weights[key]["count"] += 1

            if not topology_weights:
                logger.info("All events filtered out — nothing to predict.")
                return

            # ── Sort clusters by weight (highest recency-weighted frequency first) ──
            sorted_pairs = sorted(
                topology_weights.items(),
                key=lambda x: x[1]["weight_sum"],
                reverse=True
            )

            # ── Load existing predictions to preserve cached AI narration ────
            existing_results = await db.execute(select(Prediction))
            existing_predictions = existing_results.scalars().all()
            cache_map: dict = {}
            for p in existing_predictions:
                ckey = (_normalize_type(p.event_type), p.location.lower().strip())
                cache_map[ckey] = {
                    "explanation": p.explanation,
                    "why": p.why,
                    "how": p.how,
                    "strategic_brief": getattr(p, "strategic_brief", None),
                }

            # ── Wipe old predictions AFTER we have our plan ──────────────────
            await db.execute(delete(Prediction))
            await db.flush()  # don't commit yet — keep this in the same transaction

            # ── Insert new predictions WITHOUT blocking AI enrichment ────────
            new_records: list = []
            for key, data in sorted_pairs:
                probability = 1.0 - (1.0 / (1.0 + data["weight_sum"]))

                if probability >= 0.7:
                    risk_level = "High"
                elif probability >= 0.4:
                    risk_level = "Medium"
                else:
                    risk_level = "Low"

                base_delay = _get_base_delay(data["event_type"])
                expected_delay_days = max(1, int(base_delay * probability) + 1)

                cached = cache_map.get(key)
                if cached and cached.get("explanation"):
                    explanation = cached["explanation"]
                    why = cached["why"]
                    how = cached["how"]
                    strategic_brief = cached.get("strategic_brief")
                else:
                    # Rule-based fallback — no AI call here (prevents rate-limit crash)
                    explanation = (
                        f"Recent disruptions in {data['location']} involving "
                        f"{data['event_type']} have increased risk due to repeated "
                        f"occurrences and supply chain dependency concentration."
                    )
                    why = None
                    how = None
                    strategic_brief = None

                record = Prediction(
                    event_type=data["event_type"],
                    location=data["location"],
                    probability=round(probability, 3),
                    expected_delay_days=expected_delay_days,
                    risk_level=risk_level,
                    explanation=explanation,
                    why=why,
                    how=how,
                    strategic_brief=strategic_brief,
                )
                db.add(record)
                new_records.append((key, record, data, risk_level))

            # ── Single commit for all records ────────────────────────────────
            await db.commit()
            logger.info(
                "Predictions updated: %d unique clusters → %d predictions stored.",
                len(topology_weights), len(new_records)
            )

            # ── Background: Enrich top-5 new predictions asynchronously ──────
            # Only enrich predictions that don't already have cached narration
            # so we don't burn through API quotas on ones already enriched.
            asyncio.create_task(self._enrich_top_predictions(new_records, db))

        except Exception as e:
            logger.error("Failed to update predictions: %s", str(e))
            await db.rollback()

    async def _enrich_top_predictions(self, records: list, db: AsyncSession) -> None:
        """
        Background task: enriches up to 5 predictions that lack why/how narratives.
        Runs after the initial commit so a failure here never corrupts saved predictions.
        """
        from app.schemas.prediction import PredictionEnrichmentRequest
        enriched = 0
        for key, record, data, risk_level in records:
            if enriched >= 15:
                break
            if record.why:  # already has narration
                continue
            try:
                enrich_req = PredictionEnrichmentRequest(
                    event_type=data["event_type"],
                    location=data["location"],
                    risk_level=risk_level,
                )
                enrich_res = await self.enrich_prediction_intelligence(enrich_req, db)
                # enrich_prediction_intelligence already persists the record if valid
                enriched += 1
                await asyncio.sleep(1)  # gentle pacing
            except Exception as e_bg:
                logger.warning("Background enrichment skipped for %s/%s: %s",
                               data["event_type"], data["location"], e_bg)

    async def get_latest_predictions(self, db: AsyncSession) -> List[PredictionItem]:
        """
        Fetches the latest cached predictions from the database.
        """
        try:
            query = select(Prediction).order_by(Prediction.probability.desc())
            result = await db.execute(query)
            db_predictions = result.scalars().all()
            
            return [
                PredictionItem(
                    event_type=p.event_type,
                    location=p.location,
                    probability=p.probability,
                    expected_delay_days=p.expected_delay_days,
                    risk_level=p.risk_level,
                    explanation=p.explanation,
                    why=p.why or "Analyzing risk factors...",
                    how=p.how or "Modeling operational impact...",
                    strategic_brief=getattr(p, "strategic_brief", None),
                    is_synthesized=bool(p.why and p.how)
                )
                for p in db_predictions
            ]
        except Exception as e:
            logger.error("Failed to retrieve predictions: %s", str(e))
            # If the error is about missing columns (Schema mismatch), provide a helpful log
            if "no such column" in str(e).lower() or "missing" in str(e).lower():
                logger.warning("DB Schema out of sync with Prediction model. Run migrations or trigger refresh.")
            return []

    async def enrich_prediction_intelligence(self, request: "PredictionEnrichmentRequest", db: AsyncSession) -> "PredictionItem":
        """
        Synthesize targeted AI reasoning for a prediction using dual-phase LLM approach.
        """
        import google.generativeai as genai
        from app.core.config import get_settings
        from app.schemas.prediction import PredictionEnrichmentRequest, PredictionItem

        settings = get_settings()
        
        prompt = f"""
        You are a Strategic Supply Chain Intelligence AI. 
        Analyze this disruption FORECAST and synthesize a high-fidelity risk narrative.
        
        FORECAST: {request.event_type} in {request.location}
        RISK LEVEL: {request.risk_level}
        
        REQUIREMENTS:
        1. RISK VECTOR (WHY): Explain the underlying factors (e.g. historical patterns, dependency density, regional instability).
        2. OPERATIONAL IMPACT (HOW): Model how this disruption will propagate through the supply chain.
        3. Return ONLY a valid JSON object: {{"why": "DETAILED_WHY", "how": "DETAILED_HOW"}}
        """

        # ── Distributed Intelligence Strategy ──────────────────
        # Use a deterministic hash to split load 50/50 between Gemini and Groq as primary providers
        import hashlib
        node_id = f"{request.event_type}-{request.location}".lower()
        node_hash = int(hashlib.md5(node_id.encode()).hexdigest(), 16)
        primary_is_gemini = (node_hash % 2 == 0)

        why, how = None, None

        async def try_gemini():
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                response = await model.generate_content_async(
                    prompt,
                    generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
                )
                data = json.loads(response.text or '{}')
                return data.get("why"), data.get("how")
            except Exception as e:
                logger.warning(f"Gemini Phase Failed for {request.location}: {e}")
                return None, None

        async def try_groq():
            try:
                from groq import AsyncGroq
                if not settings.GROQ_API_KEY: return None, None
                client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                chat_completion = await client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=settings.GROQ_MODEL,
                    response_format={"type": "json_object"}
                )
                data = json.loads(chat_completion.choices[0].message.content)
                return data.get("why"), data.get("how")
            except Exception as e:
                logger.warning(f"Groq Phase Failed for {request.location}: {e}")
                return None, None

        # Execute Distributed Sequence
        if primary_is_gemini:
            why, how = await try_gemini()
            if not why: why, how = await try_groq()
        else:
            why, how = await try_groq()
            if not why: why, how = await try_gemini()

        # Final Fallbacks if both fail
        if not why:
            why = "Predictive intelligence synthesis interrupted."
            how = "Operational risk model offline."

        # ── Intelligence Validation ──────────────────
        fallbacks = {
            "Strategic factor analysis pending...",
            "Operational propagation delta pending...",
            "Predictive intelligence synthesis interrupted.",
            "Operational risk model offline."
        }
        
        is_real_synthesis = (why not in fallbacks) and (how not in fallbacks)

        # ── Persistence Step ──────────────────
        try:
            # Look up the specific prediction record to update
            stmt = select(Prediction).where(
                Prediction.event_type == request.event_type,
                Prediction.location == request.location
            )
            result = await db.execute(stmt)
            p_record = result.scalars().first()
            
            # ONLY PERSIST IF IT'S NOT A FALLBACK
            if p_record and is_real_synthesis:
                p_record.why = why
                p_record.how = how
                await db.commit()
                logger.info("Persisted intelligence for forecast: %s in %s", request.event_type, request.location)
            else:
                logger.info("Skipped persisting fallback intelligence for %s", request.location)
        except Exception as db_e:
            logger.error("Failed to persist prediction intelligence: %s", str(db_e))
            await db.rollback()
 
        return PredictionItem(
            event_type=request.event_type,
            location=request.location,
            probability=0.0,
            expected_delay_days=0,
            risk_level=request.risk_level,
            why=why,
            how=how,
            is_synthesized=is_real_synthesis
        )


# Singleton
prediction_service = PredictionService()
