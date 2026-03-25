import asyncio
import uuid
from datetime import datetime
import httpx

from app.core.database import async_session_factory
from app.models.event import Event
from app.models.news_article import NewsArticle
from app.services.graph_service import graph_service

async def test_graph_impact():
    print("Connecting to graph service...")
    await graph_service.connect()
    
    # 1. Generate a mock event
    event_id = str(uuid.uuid4())
    print(f"Generated mock event ID: {event_id}")
    
    industry = "Electronics"
    location = "Taiwan"
    severity = "critical"
    event_type = "facility_fire"
    summary = "Major fire at main TSMC semiconductor plant."
    
    # 2. Insert into PostgreSQL
    print("Inserting event into PostgreSQL database...")
    async with async_session_factory() as db:
        article = NewsArticle(
            id=event_id, # Reuse ID for simplicity
            title="Mock Article",
            url=f"mock://{event_id}",
            ingested_at=datetime.utcnow()
        )
        db.add(article)
        
        event = Event(
            id=event_id,
            source_article_id=article.id,
            event_type=event_type,
            location=location,
            country="Taiwan",
            industry=industry,
            severity=severity,
            confidence_score=0.95,
            summary=summary,
            detected_at=datetime.utcnow(),
            status="active"
        )
        db.add(event)
        await db.commit()
    
    # 3. Insert into Neo4j Graph
    print("Inserting event into Neo4j Graph...")
    await graph_service.insert_event_to_graph(
        event_id=event_id,
        industry=industry,
        location=location,
        severity=severity,
        event_type=event_type
    )
    
    # 4. Give the server a moment, then test the endpoint
    print(f"Testing GET /events/{event_id}/impact API...")
    url = f"http://localhost:8000/events/{event_id}/impact"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print(f"Status Code: {response.status_code}")
        
        data = response.json()
        print("\n--- GRAPH IMPACT RESULTS ---")
        if data.get("status") == "success":
            impact = data["data"]["impact"]
            print(f"Affected Industries: {impact.get('industries', [])}")
            print(f"Directly Affected Companies: {impact.get('companies', [])}")
            print(f"Downstream/Cascading Companies: {impact.get('downstream_companies', [])}")
        else:
            print("Error retrieving impact:", data)

    await graph_service.close()

if __name__ == "__main__":
    asyncio.run(test_graph_impact())
