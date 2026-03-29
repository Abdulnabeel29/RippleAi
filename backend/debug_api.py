import requests
import sys

def test_endpoint(endpoint):
    url = f"http://localhost:8000/events/{sys.argv[1]}/{endpoint}"
    print(f"Testing {url}...")
    try:
        resp = requests.get(url)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text[:500]}")
    except Exception as e:
        print(f"Failed: {e}")

if len(sys.argv) < 2:
    print("Usage: python debug_api.py EVENT_ID")
    sys.exit(1)

test_endpoint("impact")
test_endpoint("simulation")
