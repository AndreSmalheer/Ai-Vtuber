import os
import json

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "config.json")

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    return {
        "ollama_url": "http://localhost:11434/",
        "ollama_model": "qwen2.5-coder:1.5b-instruct",
        "base_prompt": "Your an ai companion be nice to the user",
        "stealth_mode": False,
        "user_name": "You",
        "ai_name": "AI",
        "avatar_model": "Mia-clothed.vrm",
        "tts_enabled": False,
        "piper_url": "http://localhost:10200"
    }

config = load_config()
OLLAMA_URL = config.get("ollama_url")
OLLAMA_MODEL = config.get("ollama_model")
BASE_PROMPT = config.get("base_prompt")
STEALTH_MODE = config.get("stealth_mode", False)
USER_NAME = config.get("user_name", "You")
AI_NAME = config.get("ai_name", "AI")
AVATAR_MODEL = config.get("avatar_model", "Mia-clothed.vrm")
TTS_ENABLED = config.get("tts_enabled", False)
PIPER_URL = config.get("piper_url", "http://localhost:10200")
