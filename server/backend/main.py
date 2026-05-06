import sys
import os
import json
import shutil
import requests
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pywebpush import WebPushException, webpush
from fastapi.responses import Response
import base64
from backend.services.ollama import get_piper_audio
from backend.services.ollama import get_ollama_response
from pydantic import BaseModel
from pathlib import Path


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(SCRIPT_DIR)

parent_dir = os.path.dirname(SCRIPT_DIR)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

CONFIG_PATH = os.path.join(SCRIPT_DIR, 'data', 'config.json')
SUBSCRIPTIONS_FILE = os.path.join(SCRIPT_DIR, 'data', 'subscriptions.json')

try:
    from core.config import (
        config,
        CONFIG_PATH as CORE_CONFIG_PATH,
        OLLAMA_URL,
        OLLAMA_MODEL,
        BASE_PROMPT,
        AVATAR_MODEL,
        TTS_ENABLED,
        PIPER_URL,
    )
    CONFIG_PATH = CORE_CONFIG_PATH
except ImportError:
    OLLAMA_URL = "http://localhost:11434"
    OLLAMA_MODEL = "llama3"
    BASE_PROMPT = "You are a helpful AI assistant."
    AVATAR_MODEL = "Mia-casual.vrm"
    TTS_ENABLED = False
    PIPER_URL = "http://localhost:10200"

    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            data = json.load(f)
            OLLAMA_URL = data.get("ollama_url", OLLAMA_URL)
            OLLAMA_MODEL = data.get("ollama_model", OLLAMA_MODEL)
            BASE_PROMPT = data.get("base_prompt", BASE_PROMPT)
            AVATAR_MODEL = data.get("avatar_model", AVATAR_MODEL)
            TTS_ENABLED = data.get("tts_enabled", TTS_ENABLED)
            PIPER_URL = data.get("piper_url", PIPER_URL)
    else:
        os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

        with open(CONFIG_PATH, "w") as f:
            json.dump({
                "ollama_url": OLLAMA_URL,
                "ollama_model": OLLAMA_MODEL,
                "base_prompt": BASE_PROMPT,
                "avatar_model": AVATAR_MODEL,
                "tts_enabled": TTS_ENABLED,
                "piper_url": PIPER_URL,
            }, f, indent=4)

    config = {
        "ollama_url": OLLAMA_URL,
        "ollama_model": OLLAMA_MODEL,
        "base_prompt": BASE_PROMPT,
        "avatar_model": AVATAR_MODEL,
        "tts_enabled": TTS_ENABLED,
        "piper_url": PIPER_URL,
    }

try:
    from core.history import get_history_list, delete_message, delete_history
except ImportError:
    def get_history_list(): return []
    def delete_message(index): return False
    def delete_history(): pass

try:
    from services.ollama import ollama_event_generator
except ImportError:
    def ollama_event_generator(user_message):
        yield 'data: {"error": "services.ollama not available"}\n\n'

class ChatRequest(BaseModel):
    text: str

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
VRM_MODELS_DIR = BASE_DIR.parent / "frontend" / "public" / "3d-assests" / "vrm-models"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_subscriptions():
    if not os.path.exists(SUBSCRIPTIONS_FILE):
        return []
    try:
        with open(SUBSCRIPTIONS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        print(f"Warning: Could not load or decode {SUBSCRIPTIONS_FILE}. Returning empty list.")
        return []

def save_subscriptions(subscriptions):
    try:
        with open(SUBSCRIPTIONS_FILE, "w") as f:
            json.dump(subscriptions, f, indent=4)
    except Exception as e:
        print(f"Error saving subscriptions: {e}")

async def send_push_internal(title: str, message: str, url: str = "/"):
    subscriptions = load_subscriptions()

    if not subscriptions:
        return

    payload = json.dumps({
        "title": title,
        "message": message,
        "url": url,
        "icon": "/pwa-192x192.png",
        "badge": "/pwa-192x192.png",
    })

    sent_count = 0
    stale_endpoints = set()

    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY_BACKEND,
                vapid_claims={"sub": VAPID_MAILTO_URL},
                ttl=60,
            )
            sent_count += 1

        except WebPushException as e:
            response = getattr(e, "response", None)

            if getattr(response, "status_code", None) in (404, 410):
                stale_endpoints.add(sub.get("endpoint"))

    if stale_endpoints:
        save_subscriptions([
            sub for sub in subscriptions
            if sub.get("endpoint") not in stale_endpoints
        ])

    return sent_count

@app.get("/api/notifaction/public-key")
async def get_push_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY_BACKEND}

@app.get("/api/config")
async def get_config_api():
    if not os.path.exists(CONFIG_PATH):
        raise HTTPException(status_code=404, detail="Config not found")
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

@app.post("/api/config")
async def update_config_api(request: Request):
    new_config = await request.json()
    with open(CONFIG_PATH, "w") as f:
        json.dump(new_config, f, indent=4)
    global config
    config.update(new_config)
    return {"status": "success"}

@app.get("/api/vrm-models")
async def list_vrm_models_api():
    if not os.path.exists(VRM_MODELS_DIR):
        return []
    return [f for f in os.listdir(VRM_MODELS_DIR) if f.endswith(".vrm")]

@app.post("/api/vrm-models/upload")
async def upload_vrm_model_api(file: UploadFile = File(...)):
    os.makedirs(VRM_MODELS_DIR, exist_ok=True)
    file_path = os.path.join(VRM_MODELS_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "filename": file.filename}

@app.get("/api/models")
async def get_models_api(url: str):
    try:
        response = requests.get(f"{url}/api/tags", timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching models from Ollama: {e}")
        return {"models": [], "error": f"Could not connect to Ollama at {url}"}
    except Exception as e:
        print(f"An unexpected error occurred fetching models: {e}")
        return {"models": [], "error": str(e)}

@app.post("/api/ollama")
async def ollama_stream_api(request: Request):
    data = await request.json()
    user_message = data.get("prompt", "")
    try:
        return StreamingResponse(ollama_event_generator(user_message), media_type="text/event-stream")
    except Exception as e:
        print(f"Error streaming from Ollama: {e}")
        return HTTPException(status_code=500, detail=f"Failed to stream from Ollama: {e}")

@app.get("/api/history")
async def get_history_api():
    try:
        return get_history_list()
    except Exception as e:
        print(f"Error getting history: {e}")
        return HTTPException(status_code=500, detail=f"Failed to retrieve history: {e}")

@app.delete("/api/history")
async def delete_history_api():
    try:
        delete_history()
        return {"status": "success"}
    except Exception as e:
        print(f"Error deleting history: {e}")
        return HTTPException(status_code=500, detail=f"Failed to delete history: {e}")

@app.delete("/api/history/{index}")
async def delete_message_api(index: int):
    if delete_message(index):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Index out of range")

@app.post("/api/subscribe-notifaction")
async def subscribe_push_notification(request: Request):
    try:
        data = await request.json()

        if (
            not isinstance(data, dict) or
            not isinstance(data.get("endpoint"), str) or
            not isinstance(data.get("keys"), dict) or
            not isinstance(data.get("keys").get("p256dh"), str) or
            not isinstance(data.get("keys").get("auth"), str)
        ):
            raise HTTPException(status_code=400, detail="Invalid subscription format")

        subs = load_subscriptions()

        if not any(s.get("endpoint") == data.get("endpoint") for s in subs):
            subs.append(data)
            save_subscriptions(subs)
            print(f"New subscription saved for endpoint: {data.get('endpoint')}")
        else:
            print(f"Subscription already exists for endpoint: {data.get('endpoint')}")

        return {"status": "success", "message": "Subscription received."}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

@app.post("/api/voice")
@app.get("/api/voice")
def voice(text: str):
    piper_url = config.get("piper_url")

    if not piper_url:
        raise HTTPException(status_code=500, detail="Piper URL missing in config")

    audio_b64, error = get_piper_audio(text, piper_url)

    if error:
        raise HTTPException(status_code=500, detail=error)

    if not audio_b64:
        raise HTTPException(status_code=500, detail="No audio returned")

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decode error: {str(e)}")

    return Response(
        content=audio_bytes,
        media_type="audio/wav"
    )

@app.post("/api/chat-voice")
def chat_voice(text: str):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Empty input")

    ai_text = get_ollama_response(text)

    if not ai_text:
        raise HTTPException(status_code=500, detail="Ollama returned empty response")

    piper_url = config.get("piper_url")

    audio_b64, error = get_piper_audio(ai_text, piper_url)

    if error:
        raise HTTPException(status_code=500, detail=error)

    if not audio_b64:
        raise HTTPException(status_code=500, detail="No audio returned")

    import base64
    audio_bytes = base64.b64decode(audio_b64)

    return Response(
        content=audio_bytes,
        media_type="audio/wav",
        headers={
            "X-AI-Text": ai_text
        }
    )

@app.post("/api/chat-notify")
async def chat_notify(req: ChatRequest):
    text = req.text

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Empty input")

    ai_text = get_ollama_response(text)

    if not ai_text:
        raise HTTPException(status_code=500, detail="Ollama returned empty response")

    await send_push_internal(
        title="Mia",
        message=ai_text,
        url="/"
    )

    return {
        "input": text,
        "response": ai_text,
        "status": "notification_sent"
    }

@app.post("/api/notifaction")
async def send_push_notification(request: Request):
    try:
        data = await request.json()

        title = data.get("title", "Notification")
        message = data.get("message", "You have a new message.")
        url = data.get("url", "/")

        sent_count = await send_push_internal(
            title=title,
            message=message,
            url=url
        )

        return {
            "status": "success",
            "sent_count": sent_count
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

VAPID_PUBLIC_KEY_BACKEND = os.getenv(
    "VAPID_PUBLIC_KEY",
    "BG0sZ7qsau7n56E1kdGy3Gx5Rznw5OlOZDkSnJl2pkGCvs0lKdUbAFuBTfEktjHRGjJ9WhGhetmakYesoy2AW20",
)
VAPID_PRIVATE_KEY_BACKEND = os.getenv(
    "VAPID_PRIVATE_KEY",
    "VyjBMBFJfzIERgh1mdZDU47kJ71bVKcOMbnxKysMzPc",
)
VAPID_MAILTO_URL = os.getenv("VAPID_SUBJECT", "mailto:your-email@example.com")

# Global state for cross-device activity tracking
last_seen_timestamp = 0

@app.post("/api/leave")
async def record_leave_time():
    global last_seen_timestamp
    import time
    last_seen_timestamp = time.time()
    return {"status": "success", "timestamp": last_seen_timestamp}
@app.get("/api/welcome-check")
async def welcome_check():
    global last_seen_timestamp
    import time

    current_time = time.time()
    if last_seen_timestamp == 0:
        return {"greet": False}

    # Get threshold from config, default to 120
    threshold = config.get("welcome_threshold", 120)

    time_diff = current_time - last_seen_timestamp
    if time_diff < threshold:
        return {"greet": False}

    # User was gone for more than threshold seconds
    last_seen_timestamp = 0
    return {"greet": True}




if __name__ == "__main__":
    import uvicorn
    print("Starting backend server on http://0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
