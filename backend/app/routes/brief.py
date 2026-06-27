"""
Intelligence Brief API route.

Provides the POST /brief/generate endpoint which triggers the full
intelligence brief generation pipeline (data aggregation + AI narrative).
"""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal

from app.core.database import get_db
from app.services.brief_service import brief_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Intelligence Brief"])


class BriefRequest(BaseModel):
    """Request body for the generate brief endpoint."""
    time_range: Literal["today", "week", "month"] = "week"


@router.post(
    "/brief/generate",
    summary="Generate Intelligence Brief",
    description=(
        "Aggregates supply chain events and predictions for a time range and uses "
        "Gemini to synthesize an executive intelligence narrative with full metrics, "
        "geographic exposure, industry breakdown, and recommended actions."
    ),
)
async def generate_brief(
    request: BriefRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate a full intelligence brief for the given time range.

    Args:
        request: BriefRequest with time_range field.
        db: Async database session.

    Returns:
        dict: Structured brief with threat_level, executive_summary,
              metrics, top_events, top_predictions, geographic_exposure,
              and industry_exposure.
    """
    logger.info("Intelligence brief requested: time_range=%s", request.time_range)
    try:
        brief = await brief_service.generate_brief(
            time_range=request.time_range,
            db=db,
        )
        return {"status": "success", "data": brief}
    except Exception as exc:
        logger.exception("Failed to generate intelligence brief: %s", exc)
        return {"status": "error", "message": "Brief generation failed. Please try again."}
