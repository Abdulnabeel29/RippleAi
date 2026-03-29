import os
import dotenv
from supabase import create_client

dotenv.load_dotenv()

def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    print(f"Checking Supabase REST API: {url}")
    
    supabase = create_client(url, key)
    
    # Check news_articles
    res = supabase.table("news_articles").select("count", count="exact").limit(1).execute()
    print(f"News articles count (REST): {res.count}")
    
    # Check events
    res = supabase.table("events").select("count", count="exact").limit(1).execute()
    print(f"Events count (REST): {res.count}")
    
    # Check predictions
    res = supabase.table("predictions").select("count", count="exact").limit(1).execute()
    print(f"Predictions count (REST): {res.count}")

if __name__ == "__main__":
    main()
