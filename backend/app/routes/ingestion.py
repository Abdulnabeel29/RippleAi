"""
Ingestion API route.

Exposes the POST /ingest endpoint that triggers the full
news ingestion and event detection pipeline.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import APIResponse
from app.services.ingestion_service import run_ingestion_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Ingestion"])


@router.post(
    "/ingest",
    response_model=APIResponse,
    summary="Trigger news ingestion pipeline",
    description=(
        "Fetches supply chain-related news articles from external APIs, "
        "runs AI event detection on each article, and stores the results "
        "in the database."
    ),
)
async def ingest(db: AsyncSession = Depends(get_db)) -> APIResponse:
    """
    Triggers the ingestion pipeline.

    Fetches news → detects events → stores results.

    Args:
        db: Injected async database session.

    Returns:
        APIResponse: Summary of ingestion results including counts of
            articles fetched, new articles stored, events detected, and errors.
    """
    try:
        result = await run_ingestion_pipeline(db)
        return APIResponse(
            status="success",
            data=result,
            message=(
                f"Ingestion complete: {result['articles_new']} new articles, "
                f"{result['events_detected']} events detected."
            ),
        )
    except Exception as exc:
        logger.exception("Ingestion pipeline failed: %s: %s", type(exc).__name__, str(exc))
        raise HTTPException(status_code=500, detail="Ingestion pipeline failed") from exc
