import sqlite3
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_db():
    try:
        conn = sqlite3.connect('supply_chain.db')
        c = conn.cursor()
        
        # Check if column exists
        c.execute("PRAGMA table_info(news_articles)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'embedding' not in columns:
            logger.info("Adding 'embedding' column to news_articles table...")
            c.execute("ALTER TABLE news_articles ADD COLUMN embedding JSON")
            conn.commit()
            logger.info("Column added successfully.")
        else:
            logger.info("'embedding' column already exists.")
            
        conn.close()
    except Exception as e:
        logger.error("Migration failed: %s", str(e))

if __name__ == "__main__":
    migrate_db()
