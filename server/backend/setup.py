import os
import json
import subprocess
import sys

def is_docker():
    return os.path.exists('/.dockerenv') or os.path.exists('/run/.containerenv')

if not is_docker():
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
else:
    print("Docker environment detected. Skipping venv creation and local pip install.")


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'data', 'config.json')

os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

default_host = "host.docker.internal" if is_docker() else "localhost"

data = {
    "ollama_url": f"http://{default_host}:11434",
    "ollama_model": "tinyllama:latest",
    "base_prompt": "You are a helpful AI assistant.",
    "avatar_model": "Mia-casuel.vrm",
    "tts_enabled": True,
    "piper_url": f"http://{default_host}:10200",
    "response_speed": 50,
    "stealth_mode": False,
    "enable_effects": True,
    "auto_silence_detection": False,
    "auto_send_on_mic_stop": False,
    "silence_delay_ms": 2000,
    "enable_welcome_message": True,
    "welcome_threshold": 120,
    "enable_leave_notifications": True,
    "leave_notification_min_min": 10,
    "leave_notification_max_min": 60,
    "is_dark": False,
    "orbit_controls_enabled": False,
}

if not os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=4)
    print(f"Default config created at {CONFIG_PATH} using host: {default_host}")
else:
    print(f"Config already exists at {CONFIG_PATH}. Skipping creation.")
