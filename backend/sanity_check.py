import asyncio
import uuid
import json
from datetime import datetime
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.event import Event
from app.models.news_article import NewsArticle
from app.services.graph_service import graph_service
from app.services.ingestion_service import run_ingestion_pipeline
import app.services.ingestion_service as ingestion_service
import app.services.news_service as news_service
from app.schemas.event import EventDetectionResult

async def run_sanity_checks():
    results = {
        "test_1_multiple_events": "fail",
        "test_2_duplicates_loops": "fail",
        "test_3_pipeline_mapping": "fail",
        "issues_found": [],
        "fixes_applied": []
    }
    
    print("Connecting to Neo4j...")
    await graph_service.connect()
    
    try:
        # ==========================================
        # TEST 1 & 2: Isolation, Loops, & Duplicates
        # ==========================================
        print("\n--- Running Test 1 & 2 ---")
        mock_events = [
            {"id": str(uuid.uuid4()), "type": "fire", "industry": "Electronics", "location": "Taiwan", "severity": "critical"},
            {"id": str(uuid.uuid4()), "type": "strike", "industry": "Shipping", "location": "Rotterdam", "severity": "high"},
            {"id": str(uuid.uuid4()), "type": "disruption", "industry": "Energy", "location": "Middle East", "severity": "critical"},
        ]
        
        # Insert events into graph directly
        for e in mock_events:
            await graph_service.insert_event_to_graph(
                event_id=e["id"],
                industry=e["industry"],
                location=e["location"],
                severity=e["severity"],
                event_type=e["type"]
            )
            
        # Fetch impacts
        impact_results = []
        for e in mock_events:
            impact = await graph_service.get_affected_entities(e["id"])
            impact_results.append(impact)
            
            # Test 2 checks
            all_lists = impact.get("industries", []) + impact.get("companies", []) + impact.get("downstream_companies", [])
            if len(all_lists) != len(set(all_lists)) and bool(set(impact.get("companies", [])) & set(impact.get("downstream_companies", []))):
                # A company can be both (e.g., TSMC supplies Apple). But within the list it should be distinct.
                if len(impact.get("companies", [])) != len(set(impact.get("companies", []))):
                    results["issues_found"].append(f"Duplicate found in companies list for {e['id']}")
                if len(impact.get("downstream_companies", [])) != len(set(impact.get("downstream_companies", []))):
                    results["issues_found"].append(f"Duplicate found in downstream list for {e['id']}")
        
        # Isolation check: Electronics shouldn't affect Energy or Shipping
        if "Energy" in impact_results[0].get("industries", []) or "Shipping" in impact_results[0].get("industries", []):
            results["issues_found"].append("Cross-contamination detected in Event 1 (Electronics).")
        
        if not results["issues_found"]:
            results["test_1_multiple_events"] = "pass"
            results["test_2_duplicates_loops"] = "pass"

        # ==========================================
        # TEST 3: Pipeline Mapping
        # ==========================================
        print("\n--- Running Test 3 ---")
        async def mock_fetch_news():
            # Guarantee a disruption event to trigger the insertion
            return [{
                "title": "Severe Oil Supply Disruption in Middle East",
                "description": "A massive pipeline failure has halted oil exports, severely impacting global energy supply chains.",
                "content": "Full text...",
                "url": f"mock://energy-{uuid.uuid4()}",
                "source": "Mock API"
            }]
            
        # Override Both
        original_fetch = ingestion_service.fetch_news
        ingestion_service.fetch_news = mock_fetch_news
        original_detect = ingestion_service.detect_event
        
        async def mock_detect_event(text):
            return EventDetectionResult(
                event_type="disruption",
                location="Middle East",
                country="Saudi Arabia",
                industry="Energy",
                severity="critical",
                confidence_score=0.9,
                summary="Pipeline failure"
            )
        
        ingestion_service.detect_event = mock_detect_event
        
        async with async_session_factory() as db:
            pipeline_res = await run_ingestion_pipeline(db)
            
            if pipeline_res["events_detected"] > 0:
                # Find the event in Postgres
                q = select(Event).order_by(Event.detected_at.desc()).limit(1)
                db_event = (await db.execute(q)).scalar_one_or_none()
                
                if db_event:
                    # Check Neo4j
                    g_impact = await graph_service.get_affected_entities(db_event.id)
                    if db_event.industry in g_impact.get("industries", []):
                        results["test_3_pipeline_mapping"] = "pass"
                    else:
                        results["issues_found"].append("Pipeline event not accurately mapped into Neo4j graph.")
                else:
                    results["issues_found"].append("Pipeline reported events but none found in Postgres.")
            else:
                results["issues_found"].append(f"Pipeline failed to create event. Result: {pipeline_res}")
                
        # Restore mock
        news_service.fetch_news = original_fetch
        ingestion_service.detect_event = original_detect

    except Exception as exc:
        results["issues_found"].append(f"Exception during tests: {str(exc)}")
        
    finally:
        await graph_service.close()

    print("\n\n" + json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(run_sanity_checks())
