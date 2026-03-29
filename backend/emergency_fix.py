import sqlite3
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix():
    db_path = 'supply_chain.db'
    logger.info(f"Connecting to {db_path} with high timeout...")
    try:
        # Increase timeout to 30 seconds to handle locks
        conn = sqlite3.connect(db_path, timeout=30)
        cursor = conn.cursor()
        
        # Check current columns
        cursor.execute("PRAGMA table_info(predictions)")
        cols = [row[1] for row in cursor.fetchall()]
        logger.info(f"Current columns: {cols}")
        
        for col in ["why", "how"]:
            if col not in cols:
                logger.info(f"Attempting to add column '{col}'...")
                cursor.execute(f"ALTER TABLE predictions ADD COLUMN {col} TEXT")
                logger.info(f"Column '{col}' added.")
            else:
                logger.info(f"Column '{col}' already exists.")
        
        conn.commit()
        conn.close()
        logger.info("Database schema fix complete.")
    except Exception as e:
        logger.error(f"Migration failed: {e}")

if __name__ == "__main__":
    fix()
