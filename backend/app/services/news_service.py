"""
News ingestion service.

Fetches supply chain-related news articles from the NewsAPI.
Implements timeout handling, retry logic, and structured response parsing.
"""

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Supply chain topic keywords for NewsAPI queries
SUPPLY_CHAIN_KEYWORDS = [
    "supply chain",
    "logistics disruption",
    "port congestion",
    "factory shutdown",
    "shipping delay",
    "trade embargo",
    "semiconductor shortage",
]


async def fetch_news(
    max_retries: int = 3,
    timeout_seconds: float = 30.0,
) -> list[dict[str, Any]]:
    """
    Fetches supply chain-related news articles from NewsAPI.

    Constructs a keyword-based query targeting supply chain disruption topics,
    calls the NewsAPI /everything endpoint, and returns a normalized list
    of article dictionaries.

    Args:
        max_retries: Number of retry attempts on transient failures.
        timeout_seconds: HTTP request timeout in seconds.

    Returns:
        list[dict]: List of raw article dictionaries from NewsAPI.
            Each dict contains: title, description, content, source,
            author, url, publishedAt.

    Raises:
        httpx.HTTPStatusError: If NewsAPI returns a non-2xx response
            after all retries are exhausted.
    """
    settings = get_settings()
    query = " OR ".join(f'"{kw}"' for kw in SUPPLY_CHAIN_KEYWORDS)

    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 50,
        "apiKey": settings.NEWS_API_KEY,
    }

    articles: list[dict[str, Any]] = []

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                "Fetching news from NewsAPI (attempt %d/%d).",
                attempt,
                max_retries,
            )
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(timeout_seconds)
            ) as client:
                response = await client.get(
                    f"{settings.NEWS_API_BASE_URL}/everything",
                    params=params,
                )
                response.raise_for_status()

            data = response.json()
            raw_articles = data.get("articles", [])
            articles = _normalize_articles(raw_articles)

            logger.info(
                "Successfully fetched %d articles from NewsAPI.", len(articles)
            )
            return articles

        except httpx.TimeoutException:
            logger.warning(
                "NewsAPI request timed out (attempt %d/%d).",
                attempt,
                max_retries,
            )
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "NewsAPI returned HTTP %d (attempt %d/%d): %s",
                exc.response.status_code,
                attempt,
                max_retries,
                exc.response.text[:200],
            )
            if attempt == max_retries:
                raise
        except httpx.RequestError as exc:
            logger.warning(
                "NewsAPI request error (attempt %d/%d): %s",
                attempt,
                max_retries,
                str(exc),
            )

    logger.error("All %d NewsAPI fetch attempts failed.", max_retries)
    return articles


def _normalize_articles(raw_articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Normalizes raw NewsAPI article payloads into a consistent structure.

    Filters out articles missing a title or URL (required fields).

    Args:
        raw_articles: Raw article dicts from NewsAPI response.

    Returns:
        list[dict]: Cleaned article dicts with consistent keys.
    """
    normalized = []
    for article in raw_articles:
        title = article.get("title")
        url = article.get("url")

        # Skip articles missing required fields
        if not title or not url:
            continue

        # Filter out removed/placeholder articles
        if title == "[Removed]":
            continue

        source_info = article.get("source", {})
        normalized.append(
            {
                "title": title,
                "description": article.get("description"),
                "content": article.get("content"),
                "source": source_info.get("name") if source_info else None,
                "author": article.get("author"),
                "url": url,
                "published_at": article.get("publishedAt"),
                "raw_json": article,
            }
        )

    return normalized
