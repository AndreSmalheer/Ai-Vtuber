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
        "base_prompt": "Your an ai companion be nice to the user"
    }

config = load_config()
OLLAMA_URL = config.get("ollama_url")
OLLAMA_MODEL = config.get("ollama_model")
BASE_PROMPT = config.get("base_prompt")
