from __future__ import annotations

import json
from typing import List

import httpx

from .config import LLM_API_BASE, LLM_API_KEY, LLM_MODEL_NAME


async def call_llm_for_cards(
    text: str, num_cards: int, temperature: float
) -> List[dict]:
    """
    Call the local LLM to generate flashcards from the given text.

    Expects the model to return JSON like:
      {
        "cards": [
          {"front": "...", "back": "..."},
          ...
        ]
      }
    """
    system_prompt = (
        "You are a helpful study tutor that writes high-quality flashcards.\n"
        "Given study material, you will generate concise question-answer flashcards.\n"
        "Return ONLY valid JSON with this exact structure:\n"
        '{ \"cards\": [ { \"front\": \"...\", \"back\": \"...\" }, ... ] }\n'
        "Do not include any explanations or comments.\n"
    )

    user_prompt = (
        f"Generate {num_cards} high-quality flashcards from the following text.\n"
        "Focus on the most important definitions, concepts, equations, and relationships.\n"
        "Avoid trivial or overly specific details.\n\n"
        "TEXT:\n"
        f"{text}\n"
    )

    payload = {
        "model": LLM_MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": float(temperature),
        # We don't need many tokens for JSON cards; keep this modest.
        "max_tokens": 512,
        # Explicitly ask for non-streaming response (classic OpenAI style).
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    # Longer timeout because:
    # - Prompt is large (thousands of tokens)
    # - GPU is a 1060 6GB, so prompt processing can be slow
    timeout = httpx.Timeout(300.0, connect=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{LLM_API_BASE}/chat/completions",
                headers=headers,
                json=payload,
            )
    except httpx.RequestError as e:
        # This covers ReadTimeout and other transport-level issues
        raise RuntimeError(f"LLM request failed: {e}") from e

    resp.raise_for_status()
    data = resp.json()

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"Unexpected LLM response structure: {e}") from e

    try:
        obj = json.loads(content)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"LLM did not return valid JSON: {e}") from e

    if not isinstance(obj, dict) or "cards" not in obj:
        raise RuntimeError("LLM JSON output missing 'cards' field")

    cards_field = obj["cards"]
    if not isinstance(cards_field, list):
        raise RuntimeError("'cards' must be a list")

    results: List[dict] = []
    for item in cards_field:
        if not isinstance(item, dict):
            continue
        front = item.get("front")
        back = item.get("back")
        if isinstance(front, str) and isinstance(back, str):
            front_clean = front.strip()
            back_clean = back.strip()
            if front_clean and back_clean:
                results.append({"front": front_clean, "back": back_clean})

    if not results:
        raise RuntimeError("LLM returned no valid cards")

    return results
