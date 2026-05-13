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
        "is_dark": True,
        "orbit_controls_enabled": True,
        "avatar_model": "Mia-casuel.vrm",
        "tts_enabled": False,
        "piper_url": "http://localhost:10200"
    }

config = load_config()
OLLAMA_URL = config.get("ollama_url")
OLLAMA_MODEL = config.get("ollama_model")
BASE_PROMPT = config.get("base_prompt")
STEALTH_MODE = config.get("stealth_mode", False)
ORBIT_CONTROLS_ENABLED = config.get("orbit_controls_enabled", True)
USER_NAME = "Andre"
AI_NAME = "Mia"
AVATAR_MODEL = config.get("avatar_model", "Mia-casuel.vrm")
TTS_ENABLED = config.get("tts_enabled", False)
PIPER_URL = config.get("piper_url", "http://localhost:10200")
