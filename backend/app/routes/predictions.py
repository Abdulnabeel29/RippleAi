"""
Predictions API route.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.prediction import PredictionResponse, PredictionEnrichmentRequest, PredictionItem
from app.services.prediction_service import prediction_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Predictive Intelligence"])

@router.get(
    "/predictions",
    response_model=PredictionResponse,
    summary="Get future disruption predictions",
    description="Fetches the latest statistically predicted future supply chain disruptions."
)
async def get_predictions(db: AsyncSession = Depends(get_db)) -> PredictionResponse:
    """
    Retrieves the prediction items pre-calculated by the background scheduler.
    """
    results = await prediction_service.get_latest_predictions(db)
    return PredictionResponse(predictions=results)

@router.post(
    "/predictions/enrich",
    response_model=PredictionItem,
    summary="Enrich prediction with AI intelligence",
    description="Synthesizes Deep Intelligence (Why/How reasoning) for a specific forecast."
)
async def enrich_prediction(request: PredictionEnrichmentRequest, db: AsyncSession = Depends(get_db)) -> PredictionItem:
    """
    Perform targeted AI synthesis for a single prediction item.
    """
    return await prediction_service.enrich_prediction_intelligence(request, db)

@router.get(
    "/predictions/brief",
    summary="Get Strategic Prediction Brief",
    description="Returns high-fidelity decision intelligence (narrative, timeline, actions) for a forecast."
)
async def get_prediction_brief(
    event_type: str,
    location: str,
    risk_level: str,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Generate deep-dive strategic brief for a prediction.
    """
    try:
        from app.models.prediction import Prediction
        from sqlalchemy import select
        import json
        
        # Check cache first
        query = select(Prediction).where(
            Prediction.event_type == event_type,
            Prediction.location == location
        )
        result = await db.execute(query)
        prediction = result.scalar_one_or_none()
        
        if prediction and prediction.strategic_brief:
            logger.info("Serving cached prediction brief for %s in %s", event_type, location)
            return json.loads(prediction.strategic_brief)
            
        # Fallback to AI generation
        logger.info("Cache miss for prediction brief %s (%s) - generating...", event_type, location)
        brief = await rag_service.generate_decision_intelligence(
            event_type=event_type,
            location=location,
            severity=risk_level,
            db=db,
            event_summary=f"Forecasted {event_type} risk in {location} with {risk_level} impact potential."
        )
        
        # Persist if prediction record exists
        if prediction:
            prediction.strategic_brief = json.dumps(brief)
            await db.commit()
            
        return brief
    except Exception as exc:
        logger.exception("Failed to get prediction brief: %s", str(exc))
        return {"error": "Intelligence synthesis failed"}
