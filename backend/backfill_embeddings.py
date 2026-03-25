import asyncio
import logging
import sqlite3
import json
import sys
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.services.rag_service import rag_service

async def backfill():
    logger.info("Starting embedding backfill for existing news articles...")
    
    conn = sqlite3.connect('supply_chain.db')
    c = conn.cursor()
    
    # Fetch articles without embeddings
    c.execute("SELECT id, title, description, content FROM news_articles WHERE embedding IS NULL")
    articles = c.fetchall()
    
    if not articles:
        logger.info("No articles found without embeddings.")
        conn.close()
        return

    logger.info("Found %d articles to process.", len(articles))
    
    for art_id, title, desc, content in articles:
        try:
            # Reconstruct text block for embedding
            parts = []
            if title: parts.append(f"Title: {title}")
            if desc: parts.append(f"Description: {desc}")
            if content: parts.append(f"Content: {content}")
            text = "\n\n".join(parts)
            
            emb = rag_service.generate_embedding(text)
            
            c.execute("UPDATE news_articles SET embedding = ? WHERE id = ?", (json.dumps(emb), art_id))
            logger.info("Processed article: %s", title[:50] if title else art_id)
        except Exception as e:
            logger.error("Failed to process article %s: %s", art_id, str(e))
            
    conn.commit()
    conn.close()
    logger.info("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(backfill())
