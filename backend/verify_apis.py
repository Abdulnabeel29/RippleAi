"""
API Key Verification Script.

Tests both GEMINI_API_KEY and NEWS_API_KEY end-to-end
using the same client code the production workflow uses.
"""

import asyncio
import os
import sys

# Load .env manually before importing app config
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
NEWS_API_BASE_URL = os.getenv("NEWS_API_BASE_URL", "https://newsapi.org/v2")


def separator(title: str) -> None:
    print(f"\n{'='*55}")
    print(f"  {title}")
    print('='*55)


# ─── 1. Check keys are not placeholders ───────────────────
separator("STEP 1: Checking .env values")

key_ok = True
if not GEMINI_API_KEY or GEMINI_API_KEY == "your-gemini-api-key":
    print("  [FAIL] GEMINI_API_KEY is missing or still a placeholder.")
    key_ok = False
else:
    print(f"  [OK]   GEMINI_API_KEY loaded — starts with: {GEMINI_API_KEY[:8]}...")

if not NEWS_API_KEY or NEWS_API_KEY == "your-newsapi-key":
    print("  [FAIL] NEWS_API_KEY is missing or still a placeholder.")
    key_ok = False
else:
    print(f"  [OK]   NEWS_API_KEY loaded — starts with: {NEWS_API_KEY[:8]}...")

if not key_ok:
    print("\n  [EXIT] Fix your .env keys first, then re-run this script.")
    sys.exit(1)


# ─── 2. Test Gemini API ────────────────────────────────────
separator("STEP 2: Testing Gemini API (event detection)")

try:
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)

    TEST_ARTICLE = (
        "A major earthquake struck Taiwan today disrupting semiconductor "
        "manufacturing at TSMC factories. Officials expect production to halt "
        "for at least 72 hours causing global chip shortages."
    )

    prompt = (
        "You are a supply chain disruption analyst. Analyze this article and "
        "return JSON ONLY (no markdown, no explanation).\n"
        "Schema: {\"event_type\": \"\", \"location\": \"\", \"industry\": \"\", "
        "\"severity\": \"\", \"summary\": \"\", \"confidence_score\": 0.0}\n\n"
        f"Article: {TEST_ARTICLE}"
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(temperature=0.1, max_output_tokens=300),
    )
    raw = response.text or ""
    print(f"  [OK]   Gemini responded successfully.")
    print(f"  Output: {raw[:300]}")

except Exception as e:
    print(f"  [FAIL] Gemini call failed: {type(e).__name__}: {e}")


# ─── 3. Test NewsAPI ───────────────────────────────────────
separator("STEP 3: Testing NewsAPI (news ingestion)")

try:
    import urllib.request
    import json as _json

    url = (
        f"{NEWS_API_BASE_URL}/everything"
        f"?q=supply+chain+disruption"
        f"&pageSize=3"
        f"&apiKey={NEWS_API_KEY}"
    )
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = _json.loads(resp.read().decode())

    status = data.get("status", "unknown")
    total = data.get("totalResults", 0)
    articles = data.get("articles", [])

    if status == "ok":
        print(f"  [OK]   NewsAPI responded — {total} total results found.")
        for i, a in enumerate(articles[:3], 1):
            print(f"  [{i}] {a.get('title', 'No title')[:80]}")
    else:
        print(f"  [FAIL] NewsAPI returned status: {status}")
        print(f"  Detail: {data.get('message', 'No message')}")

except Exception as e:
    print(f"  [FAIL] NewsAPI call failed: {type(e).__name__}: {e}")


# ─── Done ──────────────────────────────────────────────────
separator("VERIFICATION COMPLETE")
print()
