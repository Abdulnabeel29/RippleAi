import asyncio
import logging
import json
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.services.rag_service import rag_service
from app.models.news_article import NewsArticle
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL.replace("postgresql", "sqlite+aiosqlite"))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("\n--- Testing RAG Retrieval ---")
    async with async_session() as db:
        # Check if we have articles with embeddings
        result = await db.execute(select(NewsArticle).where(NewsArticle.embedding != None))
        articles = result.scalars().all()
        print(f"Articles with embeddings found: {len(articles)}")

        if not articles:
            print("ERROR: No articles with embeddings found. Run backfill first.")
            return

        query = "factory fire Taiwan"
        print(f"Querying for: '{query}'")
        context = await rag_service.retrieve_context(query, db)
        print(f"Retrieved {len(context)} context snippets.")
        for i, snippet in enumerate(context):
            print(f"Snippet {i+1}: {snippet[:100]}...")

        print("\n--- Testing Gemini Explanation ---")
        prediction = {
            "event_type": "factory_fire",
            "location": "Taiwan",
            "probability": 0.85,
            "risk_level": "High"
        }
        explanation = await rag_service.generate_explanation(prediction, db)
        print(f"Explanation: {explanation}")

if __name__ == "__main__":
    asyncio.run(verify())
