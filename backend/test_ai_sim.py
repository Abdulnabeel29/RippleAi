import asyncio
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

async def test_sim():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    print(f"Testing Gemini with model: {model_name}")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    
    event_type = "Labor Strike"
    location = "Port of Savannah, USA"
    industry = "Logistics"
    event_summary = "A 10,000-man strike has paralyzed container terminals in the US South East."
    
    prompt = f"""
    You are a Professional Supply Chain Intelligence Engine. 
    Analyze this news summary and map the disruption to REAL-WORLD facilities.
    
    DISRUPTION CONTEXT:
    - Type: {event_type}
    - Primary Location: {location}
    - Industry Focus: {industry}
    - Ground Truth (News): {event_summary}
    
    REQUIREMENTS:
    1. GROUND TRUTH CITING: Cite specific figures or company names from the News Summary.
    2. Map 3 vulnerabilities across 3 tiers (T1, T2, T3).
    3. Return ONLY a valid JSON array.
    """
    
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        print("Raw Response:")
        print(response.text)
        data = json.loads(response.text)
        print("Parsed JSON Successful")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"AI Call Failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_sim())
