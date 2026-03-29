import asyncio
import json
import logging
import google.generativeai as genai
from groq import Groq
from app.core.config import get_settings

settings = get_settings()

prompt = "Return exactly: {\"why\": \"test\", \"how\": \"test\"}"

async def try_gemini():
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(response_mime_type="application/json")
        )
        print("GEMINI SUCCESS:", response.text)
    except Exception as e:
        print("GEMINI ERROR:", type(e), e)

async def try_groq():
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"}
        )
        print("GROQ SUCCESS:", chat_completion.choices[0].message.content)
    except Exception as e:
        print("GROQ ERROR:", type(e), e)

async def main():
    await try_gemini()
    await try_groq()

if __name__ == "__main__":
    asyncio.run(main())
