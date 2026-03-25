"""
Events API route.

Exposes the GET /events endpoint for retrieving detected disruption
events with optional filtering and pagination.
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.event import Event
from app.schemas.common import APIResponse
from app.schemas.event import EventResponse
from app.services.graph_service import graph_service
from app.services.simulation_service import simulation_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Events"])


def _validate_event_id(event_id: str) -> None:
    """Validates event_id as UUID format."""
    try:
        uuid.UUID(event_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid event_id format") from exc


@router.get(
    "/events",
    response_model=APIResponse,
    summary="Retrieve detected disruption events",
    description=(
        "Returns all detected supply chain disruption events, "
        "with optional filtering by industry, severity, location, "
        "and status. Supports pagination via limit and offset."
    ),
)
async def get_events(
    industry: Optional[str] = Query(None, description="Filter by industry name"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    location: Optional[str] = Query(None, description="Filter by location (partial match)"),
    status: Optional[str] = Query(None, description="Filter by event status"),
    limit: int = Query(50, ge=1, le=500, description="Max results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Retrieves detected supply chain disruption events.

    Supports optional filters and pagination. Results are ordered
    by detection timestamp (most recent first).

    Args:
        industry: Filter by industry name (case-insensitive).
        severity: Filter by severity level (low|medium|high|critical).
        location: Filter by location (case-insensitive partial match).
        status: Filter by lifecycle status (active|resolved|predicted).
        limit: Maximum number of results.
        offset: Pagination offset.
        db: Injected async database session.

    Returns:
        APIResponse: List of matching events and total count.
    """
    try:
        query = select(Event)

        # Apply filters
        if industry:
            query = query.where(Event.industry.ilike(f"%{industry}%"))
        if severity:
            query = query.where(Event.severity == severity.lower())
        if location:
            query = query.where(Event.location.ilike(f"%{location}%"))
        if status:
            query = query.where(Event.status == status.lower())

        # Order by most recent first, then paginate
        query = query.order_by(Event.detected_at.desc())
        query = query.limit(limit).offset(offset)

        result = await db.execute(query)
        events = result.scalars().all()

        event_list = [
            EventResponse.model_validate(event).model_dump() for event in events
        ]

        return APIResponse(
            status="success",
            data={
                "events": event_list,
                "count": len(event_list),
                "limit": limit,
                "offset": offset,
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to retrieve events: %s: %s", type(exc).__name__, str(exc))
        raise HTTPException(status_code=500, detail="Failed to retrieve events") from exc


@router.get(
    "/events/{event_id}/impact",
    response_model=APIResponse,
    summary="Get cascading impact of an event",
    description=(
        "Retrieves a specific core event details and traversesthe supply chain graph "
        "to calculate cascading impacts to downstream industries and companies."
    ),
)
async def get_event_impact(
    event_id: str,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Fetches the base event and its graph-derived impact.
    """
    try:
        _validate_event_id(event_id)
        query = select(Event).where(Event.id == event_id)
        result = await db.execute(query)
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        impact = await graph_service.get_affected_entities(event_id)
        
        return APIResponse(
            status="success",
            data={
                "event": EventResponse.model_validate(event).model_dump(),
                "impact": impact
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch event impact: %s: %s", type(exc).__name__, str(exc))
        raise HTTPException(status_code=500, detail="Failed to fetch impact") from exc


@router.get(
    "/events/{event_id}/simulation",
    response_model=APIResponse,
    summary="Simulate ripple effect cascaded impacts",
    description=(
        "Simulates how the disruption propagates through the supply chain graph "
        "up to depth 3, calculates probability combinations, and returns numerical impact scores."
    ),
)
async def get_event_simulation(
    event_id: str,
    db: AsyncSession = Depends(get_db),
) -> APIResponse:
    """
    Executes a multi-depth graph mathematical model on the supply chain topologies.
    """
    try:
        _validate_event_id(event_id)
        query = select(Event).where(Event.id == event_id)
        result = await db.execute(query)
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        simulated_impacts = await simulation_service.simulate_impact(event_id)
        
        return APIResponse(
            status="success",
            data={
                "event": EventResponse.model_validate(event).model_dump(),
                "impacts": simulated_impacts
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to perform simulation: %s: %s", type(exc).__name__, str(exc))
        raise HTTPException(status_code=500, detail="Simulation failed") from exc
