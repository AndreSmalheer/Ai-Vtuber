import os
import json
import subprocess
import sys

def is_docker():
    return os.path.exists('/.dockerenv') or os.path.exists('/run/.containerenv')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(SCRIPT_DIR, "..")
ENV_PATH = os.path.join(SERVER_DIR, ".env")
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'data', 'config.json')

def ensure_env_file(python_exe):
    existing_vars = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, 'r') as f:
            for line in f:
                line = line.strip()
                if line and '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    existing_vars[key] = value

    needs_update = False
    if 'VAPID_PUBLIC_KEY' not in existing_vars or 'VAPID_PRIVATE_KEY' not in existing_vars:
        print("VAPID keys missing. Generating new ones...")

        gen_script = """
try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    import base64
    import json

    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    private_bytes = private_key.private_numbers().private_value.to_bytes(32, byteorder='big')
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )

    pub_key = base64.urlsafe_b64encode(public_bytes).decode('utf-8').strip('=')
    priv_key = base64.urlsafe_b64encode(private_bytes).decode('utf-8').strip('=')
    print(json.dumps({"pub": pub_key, "priv": priv_key}))
except Exception as e:
    import sys
    print(f"ERROR:{e}", file=sys.stderr)
"""
        try:
            result = subprocess.run(
                [python_exe, "-c", gen_script],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                output = result.stdout.strip()
                if output.startswith('{'):
                    keys = json.loads(output)
                    existing_vars['VAPID_PUBLIC_KEY'] = keys['pub']
                    existing_vars['VAPID_PRIVATE_KEY'] = keys['priv']
                    existing_vars['VITE_VAPID_PUBLIC_KEY'] = keys['pub']
                    needs_update = True
                else:
                    print(f"Unexpected output from key generator: {output}")
            else:
                print(f"Error generating VAPID keys: {result.stderr}")
        except Exception as e:
            print(f"Failed to run key generation: {e}")

    if needs_update:
        with open(ENV_PATH, 'w') as f:
            f.write("# Environment variables for Project Mia\n")
            for k, v in existing_vars.items():
                f.write(f"{k}={v}\n")
        print(f"Environment variables updated in {ENV_PATH}")
    else:
        if os.path.exists(ENV_PATH):
            print(f".env file already exists at {ENV_PATH}")

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
    python_path = sys.executable

ensure_env_file(python_path)

os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

default_host = "host.docker.internal" if is_docker() else "localhost"

data = {
    "welcome_threshold": 120,
    "leave_notification_min_min": 10,
    "leave_notification_max_min": 60,
    "leave_notification_prompt": "the user left, generate a message for you to send to them",
    "welcome_message_prompt": "Give a very short (1 sentence) welcome back greeting to the user who just returned.",
    "is_dark": False,
    "stealth_mode": False,
    "enable_effects": True,
    "orbit_controls_enabled": False,
    "tts_enabled": False,
    "enable_welcome_message": False,
    "avatar_model": "Mia-casuel.vrm",
    "ollama_url": "http://127.0.0.1:11434",
    "ollama_model": "tinyllama-lora-demo:latest",
    "base_prompt": "",
    "auto_silence_detection": False,
    "auto_send_on_mic_stop": False,
    "silence_delay_ms": 2000,
    "piper_url": "http://localhost:10200",
    "free_cam_enabled": False,
}

if not os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=4)
    print(f"Default config created at {CONFIG_PATH} using host: {default_host}")
else:
    print(f"Config already exists at {CONFIG_PATH}. Skipping creation.")
