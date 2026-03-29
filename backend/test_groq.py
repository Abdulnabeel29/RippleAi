import asyncio
from groq import Groq
from app.core.config import get_settings

settings = get_settings()

prompt = f"""
        You are a Strategic Supply Chain Intelligence AI. 
        Analyze this disruption FORECAST and synthesize a high-fidelity risk narrative.
        
        FORECAST: port strike in New York
        RISK LEVEL: High
        
        REQUIREMENTS:
        1. RISK VECTOR (WHY): Explain the underlying factors (e.g. historical patterns, dependency density, regional instability).
        2. OPERATIONAL IMPACT (HOW): Model how this disruption will propagate through the supply chain.
        3. Return ONLY a valid JSON object: {{"why": "DETAILED_WHY", "how": "DETAILED_HOW"}}
        """

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

if __name__ == "__main__":
    asyncio.run(try_groq())
