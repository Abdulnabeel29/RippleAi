import asyncio
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

async def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    print(f"Testing Gemini with key start: {api_key[:5] if api_key else 'None'}...")
    
    if not api_key:
        print("Error: GEMINI_API_KEY is missing from .env")
        return False
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = await model.generate_content_async("Say hello")
        print(f"Gemini Success: {response.text}")
        return True
    except Exception as e:
        print(f"Gemini Failed: {e}")
        return False

async def test_groq():
    api_key = os.getenv("GROQ_API_KEY")
    model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    print(f"Testing Groq with key start: {api_key[:5] if api_key else 'None'}...")
    
    if not api_key:
        print("Error: GROQ_API_KEY is missing from .env")
        return False
        
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say hello"}],
            model=model_name
        )
        print(f"Groq Success: {chat_completion.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"Groq Failed: {e}")
        return False

if __name__ == "__main__":
    print("--- AI DIAGNOSTIC START ---")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_gemini())
    loop.run_until_complete(test_groq())
    print("--- AI DIAGNOSTIC END ---")
