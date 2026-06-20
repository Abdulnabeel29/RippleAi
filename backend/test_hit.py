import asyncio
import threading
import uvicorn
from app.main import app
import backend_validation

def run_server():
    uvicorn.run(app, host='127.0.0.1', port=8000, log_level='critical')

async def main():
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    await asyncio.sleep(5)
    
    validator = backend_validation.BackendValidator(base_url="http://127.0.0.1:8000")
    results = await validator.run_all_tests()
    import json
    print("\n--- FINAL VALIDATION RESULTS ---")
    print(json.dumps(results, indent=2))
    
if __name__ == "__main__":
    asyncio.run(main())
