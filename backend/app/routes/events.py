"""
Events API route.

Exposes the GET /events endpoint for retrieving detected disruption
events with optional filtering and pagination.
"""

import asyncio
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# In-memory event-level decision cache: { event_id: decision_dict }
_decision_cache: dict = {}

from app.core.database import get_db
from app.models.event import Event
from app.schemas.common import APIResponse
from app.schemas.event import EventResponse, SimulationEnrichmentRequest
from app.services.graph_service import graph_service
from app.services.simulation_service import simulation_service
from app.services.rag_service import rag_service

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
        ev_uuid = uuid.UUID(event_id)
        query = select(Event).where(Event.id == ev_uuid)
        result = await db.execute(query)
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        impact = await graph_service.get_affected_entities(event_id)
        affected_entities = impact.get("industries", []) + impact.get("companies", []) + impact.get("downstream_companies", [])
        
        return APIResponse(
            status="success",
            data={
                "event": EventResponse.model_validate(event).model_dump(),
                "impact": impact,
                "affected_entities": affected_entities
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
        ev_uuid = uuid.UUID(event_id)
        query = select(Event).where(Event.id == ev_uuid)
        result = await db.execute(query)
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # --- CACHE-FIRST LOGIC ---
        import json
        if event.simulation_results:
            logger.info("Serving cached simulation for event %s", event_id)
            simulated_impacts = json.loads(event.simulation_results)
        else:
            logger.info("Simulation cache MISS for event %s - performing lazy enrichment", event_id)
            simulated_impacts = await simulation_service.simulate_impact(
                event_id=event.id,
                event_type=event.event_type,
                location=event.location,
                industry=event.industry,
                event_summary=event.summary
            )
            # Persist for next time
            event.simulation_results = json.dumps(simulated_impacts)
            await db.commit()
        
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


@router.get(
    "/events/{event_id}/decision",
    response_model=APIResponse,
    summary="Generate Actionable Decision Intelligence",
    description="Uses RAG and generative AI to synthesize strategic disruption responses, timelines, and narratives."
)
async def get_event_decision_intelligence(
    event_id: str,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    try:
        _validate_event_id(event_id)

        # ── Serve from in-memory cache if available ──────────────────
        if event_id in _decision_cache:
            logger.info("Decision cache HIT for event %s", event_id)
            return APIResponse(
                status="success",
                data={"event_id": event_id, "intelligence": _decision_cache[event_id]}
            )

        query = select(Event).where(Event.id == event_id)
        result = await db.execute(query)
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # ── Build deterministic fallback immediately so we never block ─
        severity_map = {
            "critical": "severe, potentially catastrophic",
            "high": "significant and escalating",
            "medium": "moderate with regional exposure",
            "low": "contained but monitored",
        }
        sev = str(event.severity or "medium").lower()
        severity_desc = severity_map.get(sev, "significant")
        etype = event.event_type or "disruption"
        loc = event.location or "Unknown Region"
        base_summary = (
            event.summary.strip()
            if event.summary and event.summary.strip()
            else f"A {etype} event detected in {loc} is showing {severity_desc} disruption signals."
        )
        fallback_intelligence = {
            "narrative_explanation": (
                f"{base_summary} As this {etype} develops in {loc}, supply chain operators face "
                f"{severity_desc} exposure across direct logistics dependencies. "
                "Immediate situational awareness and contingency activation is recommended."
            ),
            "impact_analysis": {
                "affected_industries": ["Logistics & Freight", "Regional Manufacturing", "Import/Export Trade"],
                "estimated_delay_timeline": "3-10 days depending on severity escalation",
                "severity_explanation": (
                    f"Classified as {sev} severity based on geographic scope of {loc} "
                    f"and historical patterns for {etype} class events."
                ),
            },
            "time_based_impact": {
                "immediate": (
                    f"Shipments routing through {loc} face immediate delays. "
                    "Expect disrupted transit windows and potential carrier rerouting within 24-48 hours."
                ),
                "short_term": (
                    f"Regional distribution hubs dependent on {loc} will face capacity strain. "
                    "Alternative routing should be activated within 3-5 days to prevent compounding delays."
                ),
                "medium_term": (
                    f"If the {etype} persists beyond 7 days, downstream inventory depletion is expected. "
                    "Supplier diversification and safety stock adjustments are essential."
                ),
            },
            "action_recommendations": [
                {
                    "strategy": "Activate Contingency Routing",
                    "operational_suggestion": (
                        f"Identify and pre-book alternative freight lanes bypassing {loc}. "
                        "Contact carriers to assess rerouting lead times immediately."
                    ),
                },
                {
                    "strategy": "Escalate Supplier Communication",
                    "operational_suggestion": (
                        f"Notify all Tier-1 suppliers operating in or dependent on {loc} about the {etype}. "
                        "Collect ETAs and confirm backup sourcing options."
                    ),
                },
            ],
        }

        # --- CACHE-FIRST LOGIC ---
        import json
        if event.strategic_brief:
            logger.info("Serving cached decision intelligence for event %s", event_id)
            decision_data = json.loads(event.strategic_brief)
        else:
            logger.info("Decision cache MISS for event %s - performing lazy enrichment", event_id)
            # ── Attempt AI enrichment with a 12 s timeout ────────────────
            try:
                decision_data = await asyncio.wait_for(
                    rag_service.generate_decision_intelligence(
                        event_type=etype,
                        location=loc,
                        severity=sev,
                        event_summary=event.summary or "",
                        db=db,
                    ),
                    timeout=12.0,
                )
                # Persist for next time
                event.strategic_brief = json.dumps(decision_data)
                await db.commit()
            except asyncio.TimeoutError:
                logger.warning("Decision intelligence timed out for event %s — serving fallback", event_id)
                decision_data = fallback_intelligence
            except Exception as ai_err:
                logger.warning("Decision AI failed for event %s (%s) — serving fallback", event_id, ai_err)
                decision_data = fallback_intelligence

        return APIResponse(
            status="success",
            data={"event_id": event.id, "intelligence": decision_data}
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to generate decision intelligence: %s", str(exc))
        raise HTTPException(status_code=500, detail="Decision intelligence generation failed") from exc


@router.post(
    "/events/{event_id}/simulate/enrich",
    response_model=APIResponse,
    summary="Enrich Simulation Node with Deep Intelligence",
    description="Asynchronously generates news-anchored Why/How reasoning for a specific node in the simulation."
)
async def enrich_simulation_intelligence(
    event_id: str,
    request: SimulationEnrichmentRequest,
    db: AsyncSession = Depends(get_db)
) -> APIResponse:
    """
    Performs targeted AI reasoning for a single node.
    """
    try:
        _validate_event_id(event_id)
        query = select(Event).where(Event.id == event_id)
        result = await db.execute(query)
        event = result.scalar_one_or_none()
        
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        enriched_node = await simulation_service.enrich_node_intelligence(
            node_target=request.target,
            depth=request.depth,
            location=event.location,
            industry=event.industry,
            event_summary=event.summary
        )
        
        return APIResponse(
            status="success",
            data=enriched_node
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to enrich simulation node: %s", str(exc))
        raise HTTPException(status_code=500, detail="Enrichment failed") from exc
