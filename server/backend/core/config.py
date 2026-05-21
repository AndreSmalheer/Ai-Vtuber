import os
import json

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "config.json")

def load_config():
    in_docker = os.path.exists("/.dockerenv")
    default_host = "host.docker.internal" if in_docker else "localhost"

    config_data = {}
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                config_data = json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")

    # Default values
    defaults = {
        "ollama_url": f"http://{default_host}:11434/",
        "ollama_model": "qwen2.5-coder:1.5b-instruct",
        "base_prompt": "Your an ai companion be nice to the user",
        "stealth_mode": False,
        "is_dark": True,
        "orbit_controls_enabled": True,
        "avatar_model": "Mia-casuel.vrm",
        "tts_enabled": False,
        "piper_url": f"http://{default_host}:10200"
    }

    # Merge defaults with loaded data
    for key, value in defaults.items():
        if key not in config_data:
            config_data[key] = value

    # Auto-fix localhost to host.docker.internal if in Docker
    if in_docker:
        for key in ["ollama_url", "piper_url"]:
            if key in config_data and isinstance(config_data[key], str):
                if "localhost" in config_data[key] or "127.0.0.1" in config_data[key]:
                    new_val = config_data[key].replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
                    if new_val != config_data[key]:
                        print(f"Docker detected: Patching {key} from {config_data[key]} to {new_val}")
                        config_data[key] = new_val

    return config_data

config = load_config()
OLLAMA_URL = os.getenv("OLLAMA_URL", config.get("ollama_url"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", config.get("ollama_model"))
BASE_PROMPT = config.get("base_prompt")
STEALTH_MODE = config.get("stealth_mode", False)
ORBIT_CONTROLS_ENABLED = config.get("orbit_controls_enabled", True)
USER_NAME = "Andre"
AI_NAME = "Mia"
AVATAR_MODEL = config.get("avatar_model", "Mia-casuel.vrm")
TTS_ENABLED = config.get("tts_enabled", False)
PIPER_URL = os.getenv("PIPER_URL", config.get("piper_url"))
