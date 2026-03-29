import asyncio
import dotenv
from app.core.database import engine

dotenv.load_dotenv()

def sync_init_db(conn):
    from app.models.base import Base
    from app.models.news_article import NewsArticle
    from app.models.event import Event
    from app.models.prediction import Prediction
    
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=conn)
    print("Creating all tables...")
    Base.metadata.create_all(bind=conn)

async def main():
    print("Starting Supabase schema initialization...")
    async with engine.begin() as conn:
        await conn.run_sync(sync_init_db)
    print("Supabase schema initialized successfully.")

if __name__ == "__main__":
    asyncio.run(main())
