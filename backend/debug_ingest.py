import asyncio
import os
import dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.models.news_article import NewsArticle
from app.services.news_service import fetch_news
from app.models.base import Base

dotenv.load_dotenv()

async def debug_ingest():
    db_url = os.getenv("DATABASE_URL")
    engine = create_async_engine(db_url, echo=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    
    # Check current articles
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM news_articles"))
        print(f"Pre-check Count: {res.scalar()}")

    # Fetch
    articles = await fetch_news()
    print(f"Fetched {len(articles)} articles.")
    
    if not articles:
        return

    # Try inserting ONE
    async with session_factory() as session:
        a_data = articles[0]
        url = a_data["url"]
        print(f"Trying to insert URL: {url}")
        
        art = NewsArticle(
            title=a_data["title"],
            url=url,
            source=a_data["source"]
        )
        session.add(art)
        await session.commit()
        print("Success! Committed one article.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_ingest())
