import time
from datetime import datetime, timedelta
import random
from email import message
import sys
import os
import json
import shutil
from pymupdf import message
import requests
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import base64
from backend.services.ollama import get_piper_audio
from backend.services.ollama import get_ollama_response
from pydantic import BaseModel
from pathlib import Path
import whisper
import tempfile
import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from backend.services.push_notifaction import send_push_internal, VAPID_PUBLIC_KEY_BACKEND, load_subscriptions, save_subscriptions
from backend.services.scheduler import scheduler_add_job, scheduler_get_jobs, scheduler_get_job, scheduler_remove_job

model = whisper.load_model("base")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(SCRIPT_DIR)

parent_dir = os.path.dirname(SCRIPT_DIR)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

data_folder =  os.path.join(SCRIPT_DIR, 'data')
os.makedirs(os.path.join(SCRIPT_DIR, "data"), exist_ok=True)

CONFIG_PATH = os.path.join(SCRIPT_DIR, 'data', 'config.json')
USER_STATE_PATH = os.path.join(SCRIPT_DIR, 'data', 'user_state.json')
SUBSCRIPTIONS_path = os.path.join(SCRIPT_DIR, 'data', 'subscriptions.json')
HISTORY_PATH = os.path.join(SCRIPT_DIR, 'data', 'history.json')

if not os.path.exists(SUBSCRIPTIONS_path):
    with open(SUBSCRIPTIONS_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=4)

if not os.path.exists(HISTORY_PATH):
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump([], f, indent=4)

def load_user_state():
    if os.path.exists(USER_STATE_PATH):
        with open(USER_STATE_PATH, "r") as f:
            return json.load(f)
    return {"onboarding_completed": False}

def save_user_state(state):
    os.makedirs(os.path.dirname(USER_STATE_PATH), exist_ok=True)
    with open(USER_STATE_PATH, "w") as f:
        json.dump(state, f, indent=4)

last_seen_timestamp = 0
last_seen_timestamp = 0
leave_job_id = None
try:
    from backend.core.config import (
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
    # ... fallback logic ...

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
            ENABLE_LEAVE_NOTIFICATIONS = data.get("enable_leave_notifications", True)
            LEAVE_NOTIFICATION_MIN_MIN = data.get("leave_notification_min_min", 10)
            LEAVE_NOTIFICATION_MAX_MIN = data.get("leave_notification_max_min", 60)
            LEAVE_NOTIFICATION_PROMPT = data.get("leave_notification_prompt", "the user left, generate a message for you to send to them")
            WELCOME_MESSAGE_PROMPT = data.get("welcome_message_prompt", "Give a very short (1 sentence) welcome back greeting to the user who just returned.")
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
                "is_dark": True,
                "enable_leave_notifications": True,
                "leave_notification_min_min": 10,
                "leave_notification_max_min": 60,
                "leave_notification_prompt": "the user left, generate a message for you to send to them",
                "welcome_message_prompt": "Give a very short (1 sentence) welcome back greeting to the user who just returned.",
            }, f, indent=4)

    config = {
        "ollama_url": OLLAMA_URL,
        "ollama_model": OLLAMA_MODEL,
        "base_prompt": BASE_PROMPT,
        "avatar_model": AVATAR_MODEL,
        "tts_enabled": TTS_ENABLED,
        "piper_url": PIPER_URL,
        "is_dark": True,
        "enable_leave_notifications": True,
        "leave_notification_min_min": 10,
        "leave_notification_max_min": 60,
        "leave_notification_prompt": "the user left, generate a message for you to send to them",
        "welcome_message_prompt": "Give a very short (1 sentence) welcome back greeting to the user who just returned.",
    }

try:
    from backend.core.history import get_history_list, delete_message, delete_history
except ImportError:
    def get_history_list(): return []
    def delete_message(index): return False
    def delete_history(): pass

try:
    from backend.services.ollama import ollama_event_generator
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

    return StreamingResponse(
        ollama_event_generator(user_message),
        media_type="text/event-stream"
    )

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

@app.post("/schedule-notification")
async def schedule_notification(request: Request):
    """
    send_time format: "2026-05-10 18:30:00"
    """
    data = await request.json()

    title = data.get("title")
    message = data.get("message")
    url = data.get("url", "/")
    send_time = data.get("send_time")

    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    if not send_time:
        raise HTTPException(status_code=400, detail="Send time is required")


    job = scheduler_add_job(
        send_push_internal,
        trigger="date",
        run_date=send_time,
        kwargs={
            "title": title,
            "message": message,
            "url": url
        }
    )

    return {"message": "Notification scheduled", "time": send_time, "job_id": job.id}

@app.put("/jobs/{job_id}")
async def edit_job(job_id: str, request: Request):
    data = await request.json()

    existing_job = scheduler_get_job(job_id)

    if not existing_job or isinstance(existing_job, str):
        raise HTTPException(status_code=404, detail="Job not found")

    func = send_push_internal
    trigger = data.get("trigger", "date")
    run_date = data.get("send_time", existing_job["run_date"])
    kwargs = data.get("kwargs", existing_job["kwargs"])

    scheduler_remove_job(job_id)

    new_job = scheduler_add_job(
        func,
        trigger=trigger,
        run_date=run_date,
        kwargs=kwargs
    )

    return {
        "message": "Job updated",
        "job_id": new_job.id
    }

@app.get("/jobs")
def get_jobs():
    return scheduler_get_jobs()

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = scheduler_get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job

@app.post("/api/notifaction")
async def send_push_notification(request: Request):
    try:
        data = await request.json()

        title = data.get("title", "placholder title")
        message = data.get("message", "placeholder message")
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

@app.post("/api/leave")
async def record_leave_time():
    global last_seen_timestamp, leave_job_id

    last_seen_timestamp = time.time()

    if leave_job_id:
        scheduler_remove_job(leave_job_id)
        leave_job_id = None

    if not config.get("enable_leave_notifications", True):
        return {
            "status": "leave recorded",
            "timestamp": last_seen_timestamp,
            "notifications_disabled": True
        }

    min_min = config.get("leave_notification_min_min", 10)
    max_min = config.get("leave_notification_max_min", 60)

    if min_min > max_min:
        min_min, max_min = max_min, min_min

    delay_minutes = random.randint(min_min, max_min)
    run_time = datetime.now() + timedelta(minutes=delay_minutes)
    print(f"Scheduling welcome notification in {delay_minutes} minutes will be sent at {run_time}", flush=True)

    leave_prompt = config.get("leave_notification_prompt", "the user left, generate a message for you to send to them")
    response = get_ollama_response(leave_prompt)

    job = scheduler_add_job(
        send_push_internal,
        trigger="date",
        run_date=run_time,
        kwargs={
            "title": "Mia",
            "message": response,
            "url": "/"
        }
    )

    leave_job_id = job.id

    return {
        "status": "leave recorded",
        "timestamp": last_seen_timestamp,
        "scheduled_in_minutes": delay_minutes,
        "job_id": job.id
    }
@app.get("/api/welcome-check")
async def welcome_check():
    global last_seen_timestamp, leave_job_id

    current_time = time.time()
    if last_seen_timestamp == 0:
        return {"greet": False}

    threshold = config.get("welcome_threshold", 120)

    if leave_job_id:
        # print(f"Canceling scheduled welcome notification with job ID: {leave_job_id}", flush=True)
        scheduler_remove_job(leave_job_id)
        leave_job_id = None

    time_diff = current_time - last_seen_timestamp
    if time_diff < threshold:
        return {"greet": False}

    last_seen_timestamp = 0
    return {"greet": True}

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        result = model.transcribe(tmp_path)
        return { "text": result["text"].strip() }
    finally:
        os.remove(tmp_path)

@app.get("/api/onboarding/status")
async def get_onboarding_status():
    state = load_user_state()
    return {"completed": state.get("onboarding_completed", False)}

@app.post("/api/onboarding/complete")
async def complete_onboarding():
    state = load_user_state()
    state["onboarding_completed"] = True
    save_user_state(state)
    return {"status": "success"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    print("Starting backend server on http://0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
