"""
Predictions API route.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.prediction import PredictionResponse
from app.services.prediction_service import prediction_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Predictive Intelligence"])

@router.get(
    "/predictions",
    response_model=PredictionResponse,
    summary="Get future disruption predictions",
    description="Uses historical statistical data to predict probability of future supply chain disruptions."
)
async def get_predictions(db: AsyncSession = Depends(get_db)) -> PredictionResponse:
    """
    Executes the statistical predictive engine and maps historical frequency into probabilities.
    """
    results = await prediction_service.generate_predictions(db)
    return PredictionResponse(predictions=results)
