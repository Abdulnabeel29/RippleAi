import asyncio
import os
import google.generativeai as genai
from dotenv import load_dotenv

async def test_gemini():
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    
    print(f"Testing Gemini with key: {api_key[:10]}... and model: {model_name}")
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = await model.generate_content_async("Hello, are you online? Respond with 'Online'")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_gemini())
