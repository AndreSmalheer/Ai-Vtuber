import sys
import os
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil

# Ensure the current directory is in sys.path for local package imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ollama import ollama_event_generator
from core.history import get_history_list, delete_message, delete_history
from core.config import config, CONFIG_PATH
import json
import requests

app = FastAPI()

VRM_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "3d-assests", "vrm-models")

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
    core.config.AVATAR_MODEL = new_config.get("avatar_model", "Mia-clothed.vrm")
    core.config.TTS_ENABLED = new_config.get("tts_enabled", False)
    core.config.PIPER_URL = new_config.get("piper_url", "http://localhost:10200")
    
    return {"status": "success"}

@app.get("/api/vrm-models")
async def list_vrm_models():
    try:
        if not os.path.exists(VRM_MODELS_DIR):
            return []
        files = [f for f in os.listdir(VRM_MODELS_DIR) if f.endswith(".vrm")]
        return files
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/vrm-models/upload")
async def upload_vrm_model(file: UploadFile = File(...)):
    try:
        if not os.path.exists(VRM_MODELS_DIR):
            os.makedirs(VRM_MODELS_DIR)
        
        file_path = os.path.join(VRM_MODELS_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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
