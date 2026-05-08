import os
import json
import subprocess
import sys

VENV_DIR = ".venv"

if not os.path.exists(VENV_DIR):
    print("Creating virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", VENV_DIR])

if os.name == "nt":
    python_path = os.path.join(VENV_DIR, "Scripts", "python.exe")
else:
    python_path = os.path.join(VENV_DIR, "bin", "python")

print("Installing Python dependencies...")

result = subprocess.run(
    [python_path, "-m", "pip", "install", "-r", "backend/requirements.txt"],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("Python environment ready.")
else:
    print("Error occurred while installing Python dependencies.")
    print(result.stderr)


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'data', 'config.json')

os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

data = {
    "ollama_url": "http://localhost:11434",
    "ollama_model": "tinyllama:latest",
    "base_prompt": "You are a helpful AI assistant.",
    "avatar_model": "Mia-casual.vrm",
    "tts_enabled": True,
    "piper_url": "http://localhost:10200",
    "response_speed": 50,
    "stealth_mode": False,
    "enable_effects": True,
    "auto_silence_detection": False,
    "auto_send_on_mic_stop": False,
    "silence_delay_ms": 2000,
    "enable_welcome_message": True,
    "welcome_threshold": 120
}

with open(CONFIG_PATH, "w") as f:
    json.dump(data, f, indent=4)
