import requests
import json
from core.config import OLLAMA_URL, OLLAMA_MODEL, BASE_PROMPT
from core.history import get_history, add_history
import core.config

def ollama_event_generator(user_message):
    prompt = get_history() + f"{core.config.USER_NAME}: {user_message}\n{core.config.AI_NAME}:"

    payload = {
        "model": core.config.OLLAMA_MODEL,
        "prompt": (core.config.BASE_PROMPT + prompt) if core.config.BASE_PROMPT else prompt,
        "stream": True
    }

    response = requests.post(
        f"{core.config.OLLAMA_URL}/api/generate",
        json=payload,
        stream=True
    )


    full_response = ""

    for line in response.iter_lines():
        if not line:
            continue

        try:
            data = json.loads(line.decode("utf-8"))
        except json.JSONDecodeError:
            continue

        if "response" in data:
            chunk = data["response"]
            full_response += chunk
            yield f"data: {json.dumps({'text': chunk})}\n\n"

        if data.get("done"):
            add_history(user_message, full_response)

    yield f"data: {json.dumps({'finish_reason': 'stop'})}\n\n"
