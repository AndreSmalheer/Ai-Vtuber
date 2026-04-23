import sys
import os
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure the current directory is in sys.path for local package imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ollama import ollama_event_generator
from core.history import get_history_list, delete_message, delete_history
from core.config import config, CONFIG_PATH
import json
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/config")
async def get_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

@app.post("/api/config")
async def update_config(request: Request):
    new_config = await request.json()
    with open(CONFIG_PATH, "w") as f:
        json.dump(new_config, f, indent=4)
    
    # Update current runtime config
    global config
    config.update(new_config)
    import core.config
    core.config.OLLAMA_URL = new_config.get("ollama_url")
    core.config.OLLAMA_MODEL = new_config.get("ollama_model")
    core.config.BASE_PROMPT = new_config.get("base_prompt")
    core.config.USER_NAME = new_config.get("user_name", "You")
    core.config.AI_NAME = new_config.get("ai_name", "AI")
    core.config.TTS_ENABLED = new_config.get("tts_enabled", False)
    core.config.PIPER_URL = new_config.get("piper_url", "http://localhost:10200")
    
    return {"status": "success"}

@app.get("/api/models")
async def get_models(url: str):
    try:
        response = requests.get(f"{url}/api/tags", timeout=5)
        if response.status_code == 200:
            return response.json()
        return {"error": f"Ollama returned status code {response.status_code}", "models": []}
    except requests.exceptions.RequestException as e:
        return {"error": f"Could not connect to Ollama: {str(e)}", "models": []}
    except Exception as e:
        return {"error": str(e), "models": []}

@app.post("/api/ollama")
async def ollama_stream(request: Request):
    data = await request.json()
    user_message = data.get("prompt", "")
    return StreamingResponse(ollama_event_generator(user_message), media_type="text/event-stream")

@app.get("/api/history")
async def get_history_api():
    return get_history_list()

@app.delete("/api/history")
async def delete_history_api():
    delete_history()
    return {"status": "success"}

@app.delete("/api/history/{index}")
async def delete_message_api(index: int):
    if delete_message(index):
        return {"status": "success"}
    return {"status": "error", "message": "Index out of range"}
