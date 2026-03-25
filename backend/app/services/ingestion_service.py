"""
Ingestion pipeline orchestrator.

Coordinates the end-to-end ingestion flow:
1. Fetch news articles from external APIs
2. Deduplicate and store new articles in PostgreSQL
3. Run AI event detection on each new article
4. Store detected events in PostgreSQL

Designed for resilience — a failure on any single article does not
block processing of the remaining articles.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.news_article import NewsArticle
from app.services.event_detection_service import detect_event
from app.services.news_service import fetch_news
from app.services.graph_service import graph_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)


async def run_ingestion_pipeline(db: AsyncSession) -> dict[str, Any]:
    """
    Executes the full ingestion pipeline.

    Fetches news articles, deduplicates by URL, stores new articles,
    runs AI event detection on each, and persists detected events.

    Args:
        db: Active async database session.

    Returns:
        dict: Summary of pipeline results containing:
            - articles_fetched: Total articles retrieved from API.
            - articles_new: Articles actually inserted (after dedup).
            - events_detected: Number of events successfully extracted.
            - errors: Number of articles that failed processing.
    """
    logger.info("=== Ingestion pipeline started ===")

    result = {
        "articles_fetched": 0,
        "articles_new": 0,
        "events_detected": 0,
        "errors": 0,
    }

    # ── Step 1: Fetch raw articles ──────────────────────────────
    try:
        raw_articles = await fetch_news()
        result["articles_fetched"] = len(raw_articles)
        logger.info("Fetched %d articles from NewsAPI.", len(raw_articles))
    except Exception as exc:
        logger.error("Failed to fetch news: %s: %s", type(exc).__name__, str(exc))
        return result

    if not raw_articles:
        logger.info("No articles fetched. Pipeline complete.")
        return result

    # ── Step 2: Deduplicate and store articles ──────────────────
    new_articles = await _store_articles(db, raw_articles)
    result["articles_new"] = len(new_articles)
    logger.info("Stored %d new articles (after deduplication).", len(new_articles))

    # ── Step 3: Detect and store events ─────────────────────────
    for article in new_articles:
        try:
            article_text = _build_article_text(article)
            event_data = await detect_event(article_text)

            # Rate-limit delay between Gemini API calls (free tier: 15 RPM)
            await asyncio.sleep(2)

            if event_data is not None:
                event = Event(
                    event_type=event_data.event_type,
                    location=event_data.location,
                    country=event_data.country,
                    industry=event_data.industry,
                    severity=event_data.severity,
                    confidence_score=event_data.confidence_score,
                    summary=event_data.summary,
                    source_article_id=article.id,
                    detected_at=datetime.now(timezone.utc),
                    status="active",
                )
                db.add(event)
                await db.flush()
                
                await graph_service.insert_event_to_graph(
                    event_id=event.id,
                    industry=event.industry,
                    location=event.location,
                    severity=event.severity,
                    event_type=event.event_type
                )
                
                result["events_detected"] += 1
                logger.info(
                    "Event detected for article '%s': %s (%s)",
                    article.title[:60],
                    event_data.event_type,
                    event_data.severity,
                )
            else:
                logger.debug(
                    "No disruption event found in article: '%s'",
                    article.title[:60],
                )

        except Exception as exc:
            result["errors"] += 1
            logger.error(
                "Error processing article '%s': %s: %s",
                article.title[:60] if article.title else "unknown",
                type(exc).__name__,
                str(exc),
            )
            # Continue processing remaining articles
            continue

    await db.commit()

    logger.info(
        "=== Ingestion pipeline complete === "
        "fetched=%d, new=%d, events=%d, errors=%d",
        result["articles_fetched"],
        result["articles_new"],
        result["events_detected"],
        result["errors"],
    )
    return result


async def _store_articles(
    db: AsyncSession,
    raw_articles: list[dict[str, Any]],
) -> list[NewsArticle]:
    """
    Stores articles in the database, skipping duplicates by URL.

    Checks each URL against existing records before inserting.
    Duplicates are silently skipped.

    Args:
        db: Active async database session.
        raw_articles: List of normalized article dicts from news_service.

    Returns:
        list[NewsArticle]: Only the newly inserted article ORM objects.
    """
    new_articles: list[NewsArticle] = []

    for article_data in raw_articles:
        url = str(article_data.get("url", ""))
        if not url:
            continue

        # Check if article with this URL already exists
        existing = await db.execute(
            select(NewsArticle).where(NewsArticle.url == url)
        )
        if existing.scalar_one_or_none() is not None:
            logger.debug("Skipping duplicate article: %s", url[:80])
            continue

        # Parse published_at timestamp if present
        published_at = None
        raw_published = article_data.get("published_at")
        if raw_published:
            try:
                published_at = datetime.fromisoformat(
                    raw_published.replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                logger.warning("Could not parse published_at: %s", raw_published)

        article = NewsArticle(
            title=article_data.get("title", ""),
            description=article_data.get("description"),
            content=article_data.get("content"),
            source=article_data.get("source"),
            author=article_data.get("author"),
            url=url,
            published_at=published_at,
            ingested_at=datetime.now(timezone.utc),
            raw_json=article_data.get("raw_json"),
        )
        
        # Generate embedding for RAG
        try:
            article_text = _build_article_text(article)
            article.embedding = await rag_service.generate_embedding_async(article_text)
        except Exception as e:
            logger.warning("Failed to generate embedding for article: %s", str(e))
            
        db.add(article)

        try:
            await db.flush()
            new_articles.append(article)
        except Exception as exc:
            logger.warning(
                "Failed to insert article '%s': %s",
                url[:80],
                str(exc),
            )
            await db.rollback()
            continue

    return new_articles


def _build_article_text(article: NewsArticle) -> str:
    """
    Constructs the text input for the AI event detection model.

    Concatenates available article fields into a single text block.

    Args:
        article: NewsArticle ORM object.

    Returns:
        str: Combined text from title, description, and content.
    """
    parts = []
    if article.title:
        parts.append(f"Title: {article.title}")
    if article.description:
        parts.append(f"Description: {article.description}")
    if article.content:
        parts.append(f"Content: {article.content}")
    return "\n\n".join(parts)
