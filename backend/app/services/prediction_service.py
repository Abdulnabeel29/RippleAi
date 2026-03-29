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
        try:
            # 30-day time window
            window_start = datetime.now(timezone.utc) - timedelta(days=30)
            
            # Query events within the 30-day window
            query = select(Event).where(Event.detected_at >= window_start)
            result = await db.execute(query)
            events = result.scalars().all()

            if not events:
                return

            # Aggregate weights by (event_type, location)
            # weight = 1 / (1 + days_since_event)
            now = datetime.now(timezone.utc)
            topology_weights = {}
            total_global_weight = 0.0

            for event in events:
                ev_type = (event.event_type or "").lower().strip()
                loc = (event.location or "").lower().strip()
                
                # Filter out useless data
                if loc == "unknown" or ev_type in ["unknown", "noise", ""]:
                    continue
                    
                key = (ev_type, loc)
                
                days_since = (now - event.detected_at).total_seconds() / (24 * 3600)
                # Ensure non-negative days_since due to potential clock skew
                days_since = max(0.0, days_since)
                
                weight = 1.0 / (1.0 + days_since)
                
                if key not in topology_weights:
                    topology_weights[key] = {
                        "weight_sum": 0.0,
                        "event_type": event.event_type,
                        "location": event.location,
                        "max_severity": event.severity
                    }
                
                topology_weights[key]["weight_sum"] += weight
                total_global_weight += weight

            # Load existing predictions to preserve cached AI data
            existing_preds_query = select(Prediction)
            existing_results = await db.execute(existing_preds_query)
            existing_predictions = existing_results.scalars().all()
            
            cache_map = {}
            for p in existing_predictions:
                ckey = (p.event_type.lower().strip(), p.location.lower().strip())
                cache_map[ckey] = {
                    "explanation": p.explanation,
                    "why": p.why,
                    "how": p.how,
                    "strategic_brief": getattr(p, "strategic_brief", None)
                }

            # Clear old predictions
            await db.execute(delete(Prediction))

            for key, data in topology_weights.items():
                # Normalized Probability across all active predictions
                probability = 1.0 - (1.0 / (1.0 + data["weight_sum"]))
                
                # Assign dynamic Risk Level string
                if probability >= 0.7:
                    risk_level = "High"
                elif probability >= 0.4:
                    risk_level = "Medium"
                else:
                    risk_level = "Low"
                    
                # Calculate delays based on probability and typical severity
                base_delay = _get_base_delay(data["event_type"])
                expected_delay_days = max(1, int(base_delay * probability) + 1)

                cached_entry = cache_map.get(key)
                if cached_entry and cached_entry.get("explanation"):
                    # Reuse cached intelligence completely
                    explanation = cached_entry["explanation"]
                    why = cached_entry["why"]
                    how = cached_entry["how"]
                    strategic_brief = cached_entry.get("strategic_brief")
                else:
                    # Generate RAG Explanation for unseen disruption clusters only
                    prediction_dict = {
                        "event_type": data["event_type"],
                        "location": data["location"],
                        "probability": round(probability, 3),
                        "risk_level": risk_level
                    }
                    explanation = await rag_service.generate_explanation(prediction_dict, db)
                    
                    # --- NEW: ENRICH ON CREATION ---
                    try:
                        logger.info("Enriching new prediction: %s in %s", data['event_type'], data['location'])
                        # We use a minimal enrichment call here to populate why/how
                        from app.schemas.prediction import PredictionEnrichmentRequest
                        enrich_req = PredictionEnrichmentRequest(
                            event_type=data["event_type"],
                            location=data["location"],
                            risk_level=risk_level
                        )
                        # Avoid recursive DB commit by just getting the data
                        enrich_res = await self.enrich_prediction_intelligence(enrich_req, db)
                        why = enrich_res.why
                        how = enrich_res.how
                        
                        # Also generate decision brief for this potential event
                        brief_res = await rag_service.generate_decision_intelligence(
                            event_type=data["event_type"],
                            location=data["location"],
                            severity=risk_level.lower(),
                            db=db
                        )
                        strategic_brief = json.dumps(brief_res)
                        
                        # Wait 2s to respect rate limits
                        await asyncio.sleep(2)
                    except Exception as e_enrich:
                        logger.warning("Initial enrichment failed for %s: %s", data['location'], e_enrich)
                        why = None
                        how = None
                        strategic_brief = None
                    # ------------------------------

                db.add(Prediction(
                    event_type=data["event_type"],
                    location=data["location"],
                    probability=round(probability, 3),
                    expected_delay_days=expected_delay_days,
                    risk_level=risk_level,
                    explanation=explanation,
                    why=why,
                    how=how,
                    strategic_brief=strategic_brief
                ))
            
            await db.commit()

        except Exception as e:
            logger.error("Failed to update predictions: %s", str(e))
            await db.rollback()

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
