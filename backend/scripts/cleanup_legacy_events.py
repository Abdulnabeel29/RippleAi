"""
Script to clean up legacy events in the database.

Identifies events with missing summary or confidence_score and updates them
with default legacy values to ensure data quality standards.
"""

import asyncio
import argparse
import logging
import sys
import os

# Add backend directory to sys.path to allow imports from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, or_
from app.core.database import async_session_factory
from app.models.event import Event
from app.models.news_article import NewsArticle  # Import to ensure metadata is registered for FKs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

async def cleanup_events(dry_run: bool = False):
    """
    Finds and updates legacy events.
    """
    logger.info(f"Starting legacy event cleanup (dry_run={dry_run})...")
    
    async with async_session_factory() as session:
        # Query for events with missing summary or confidence_score
        stmt = select(Event).where(
            or_(
                Event.summary == None,
                Event.confidence_score == None
            )
        )
        
        result = await session.execute(stmt)
        events = result.scalars().all()
        
        if not events:
            logger.info("No legacy events found.")
            return

        logger.info(f"Found {len(events)} legacy events.")
        
        updates_count = 0
        for event in events:
            modified = False
            
            if event.summary is None:
                if not dry_run:
                    event.summary = "Legacy event — summary unavailable"
                modified = True
                
            if event.confidence_score is None:
                if not dry_run:
                    event.confidence_score = 0.5
                modified = True
                
            if modified:
                updates_count += 1
                if dry_run:
                    logger.info(f"[DRY-RUN] Would update Event ID: {event.id}")
                else:
                    logger.debug(f"Updated Event ID: {event.id}")

        if not dry_run:
            try:
                await session.commit()
                logger.info(f"Successfully updated {updates_count} events.")
            except Exception as e:
                await session.rollback()
                logger.error(f"Failed to commit changes: {e}")
                raise
        else:
            logger.info(f"[DRY-RUN] Total events to be updated: {updates_count}")

async def main():
    parser = argparse.ArgumentParser(description="Clean up legacy events in the database.")
    parser.add_argument(
        "--dry-run", 
        action="store_true", 
        help="Preview changes without committing to the database."
    )
    args = parser.parse_args()
    
    await cleanup_events(dry_run=args.dry_run)

if __name__ == "__main__":
    asyncio.run(main())
