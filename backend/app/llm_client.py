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
    example_prompt = (
        "Generate 2 high-quality flashcards from the following text.\n\n"
        "Focus on the most important definitions, concepts, equations, and relationships.\n"
        "TEXT:\n"
        """Louis Antony's "No good reason" argument 
        Premises: 1. If an omnipotent (all-powerful) and omnibenevolent (all-good) God exists, He would not allow unnecessary suffering. 
        2. There is immense suffering in the world, including natural disasters, diseases, and extreme human suffering. 
        3. An all-good God would only allow suffering if there were a morally sufficient reason to justify it. 
        4. There is no good reason for much of the suffering we observe (e.g., the suffering of innocent children, natural disasters that serve no moral purpose, senseless pain). 5. If there is **no good reason** for God to allow suffering, then an omnipotent, omnibenevolent God **cannot exist**. 
        Conclusion: 
        - Since unnecessary suffering exists, and an all-powerful, all-good God would not allow it without good reason, God does not exist Free Will Defense 
        - Some argue that suffering results from human free will and that God values free will so much that He allows the consequences of bad choices. However, this does not explain natural disasters or diseases. Soul-Making Theodicy (John Hick) 
        - Some argue that suffering builds character and is necessary for moral and spiritual growth. 
        Antony's counter would be: Does suffering really need to be this extreme? Wouldn't an all-loving God design a world where growth happens without unbearable suffering? Skeptical Theism 
        - Some theists argue that just because we don't see a good reason for suffering does not mean there isn't one. God's ways may be beyond human understanding. However, this can be criticized as an argument from ignorance (assuming God's reason exists simply because we don't know it).
    """)
    example_response = (
        """{
            "cards": [
                {
                "front": "What is Louis Antony's core claim in the \"No good reason\" argument regarding God and suffering?",
                "back": "If an all-powerful, all-good God existed, unnecessary suffering would not occur; since such suffering exists without good justification, an omnipotent and omnibenevolent God cannot exist."
                },
                {
                "front": "How does skeptical theism respond to Antony's argument, and what is its major criticism?",
                "back": "Skeptical theism claims that humans may not understand God's reasons for allowing suffering, but critics argue this is an argument from ignorance because it assumes a reason exists simply because we do not know it."
                }
            ]
            }"""
    )
    user_prompt = (
        f"Generate {num_cards} high-quality flashcards from the following text.\n"
        "Focus on the most important definitions, concepts, equations, and relationships.\n"
        "TEXT:\n"
        f"{text}\n"
    )

    payload = {
        "model": LLM_MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": example_prompt},
            {"role": "assistant", "content": example_response},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": float(temperature),
        "max_tokens": 5000,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    # - longer timeout bc my GPU is a 1060 6GB, so prompt processing can be slow
    timeout = httpx.Timeout(300.0, connect=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                f"{LLM_API_BASE}/chat/completions",
                headers=headers,
                json=payload,
            )
    except httpx.RequestError as e:
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
