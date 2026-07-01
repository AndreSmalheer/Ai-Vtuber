import os
import json
import subprocess
import sys
import sqlite3
from dotenv import load_dotenv

def is_docker():
    return os.path.exists('/.dockerenv') or os.path.exists('/run/.containerenv')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(SCRIPT_DIR, "..")
ENV_PATH = os.path.join(SERVER_DIR, ".env")
CONFIG_PATH = os.path.join(SCRIPT_DIR, 'data', 'config.json')
DB_PATH = os.path.join(SCRIPT_DIR, "data", "database.db")

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

def initialize_database():
    load_dotenv(ENV_PATH)

    mysql_host = os.getenv("MYSQL_HOST")
    mysql_port = os.getenv("MYSQL_PORT", "3306")
    mysql_user = os.getenv("MYSQL_USER")
    mysql_password = os.getenv("MYSQL_PASSWORD")
    mysql_database = os.getenv("MYSQL_DATABASE")

    if all([mysql_host, mysql_user, mysql_database]):
        try:
            import mysql.connector

            conn = mysql.connector.connect(
                host=mysql_host,
                port=int(mysql_port),
                user=mysql_user,
                password=mysql_password,
                database=mysql_database,
                connection_timeout=5
            )

            conn.close()
            print("Connected to MySQL successfully.")
            return "mysql"

        except Exception as e:
            print(f"Could not connect to MySQL: {e}")
            print("Falling back to SQLite.")

    else:
        print("No MySQL configuration found. Using SQLite.")

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    db_exists = os.path.exists(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS config (
            user_id INTEGER PRIMARY KEY,

            stealth_mode INTEGER,
            orbit_controls_enabled INTEGER,
            tts_enabled INTEGER,
            enable_leave_notifications INTEGER,
            enable_effects INTEGER,
            is_dark INTEGER,
            enable_welcome_message INTEGER,
            free_cam_enabled INTEGER,

            avatar_model TEXT,
            ollama_url TEXT,
            ollama_model TEXT,
            base_prompt TEXT,
            piper_url TEXT,

            leave_notification_prompt TEXT,
            leave_notification_min_min INTEGER,
            leave_notification_max_min INTEGER,

            welcome_threshold INTEGER,
            welcome_message_prompt TEXT,

            response_speed INTEGER,

            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        INSERT OR IGNORE INTO config (
            user_id,
            stealth_mode,
            orbit_controls_enabled,
            tts_enabled,
            enable_leave_notifications,
            enable_effects,
            is_dark,
            enable_welcome_message,
            free_cam_enabled,

            avatar_model,
            ollama_url,
            ollama_model,
            base_prompt,
            piper_url,

            leave_notification_prompt,
            leave_notification_min_min,
            leave_notification_max_min,

            welcome_threshold,
            welcome_message_prompt,

            response_speed
        )
        VALUES (
            1,
            0,
            0,
            1,
            0,
            1,
            0,
            0,
            0,

            'Mia-casuel.vrm',
            'http://localhost:11434',
            'tinyllama:latest',
            '',
            'http://localhost:5000',

            'The user left the app send a message saying you miss them',
            1,
            2,

            30,
            'the user is back',

            20
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            prompt TEXT,
            response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            endpoint TEXT NOT NULL,
            p256dh_key TEXT NOT NULL,
            auth_key TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()

    if db_exists:
        print("SQLite database already exists.")
    else:
        print(f"Created SQLite database: {DB_PATH}")

    return "sqlite"

# if not is_docker():
#     VENV_DIR = ".venv"

#     if not os.path.exists(VENV_DIR):
#         print("Creating virtual environment...")
#         subprocess.run([sys.executable, "-m", "venv", VENV_DIR])

#     if os.name == "nt":
#         python_path = os.path.join(VENV_DIR, "Scripts", "python.exe")
#     else:
#         python_path = os.path.join(VENV_DIR, "bin", "python")

#     print("Installing Python dependencies...")

#     result = subprocess.run(
#         [python_path, "-m", "pip", "install", "-r", "backend/requirements.txt"],
#         capture_output=True,
#         text=True
#     )

#     if result.returncode == 0:
#         print("Python environment ready.")
#     else:
#         print("Error occurred while installing Python dependencies.")
#         print(result.stderr)
# else:
#     print("Docker environment detected. Skipping venv creation and local pip install.")
#     python_path = sys.executable

# ensure_env_file(python_path)
database_type = initialize_database()

# os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)

# default_host = "host.docker.internal" if is_docker() else "localhost"

# data = {
#     "ollama_url": f"http://{default_host}:11434",
#     "ollama_model": "tinyllama:latest",
#     "base_prompt": "You are a helpful AI assistant.",
#     "avatar_model": "Mia-casuel.vrm",
#     "tts_enabled": True,
#     "piper_url": f"http://{default_host}:10200",
#     "response_speed": 50,
#     "stealth_mode": False,
#     "enable_effects": True,
#     "auto_silence_detection": False,
#     "auto_send_on_mic_stop": False,
#     "silence_delay_ms": 2000,
#     "enable_welcome_message": True,
#     "welcome_threshold": 120,
#     "enable_leave_notifications": True,
#     "leave_notification_min_min": 10,
#     "leave_notification_max_min": 60,
#     "is_dark": False,
#     "orbit_controls_enabled": False,
# }

# if not os.path.exists(CONFIG_PATH):
#     with open(CONFIG_PATH, "w") as f:
#         json.dump(data, f, indent=4)
#     print(f"Default config created at {CONFIG_PATH} using host: {default_host}")
# else:
#     print(f"Config already exists at {CONFIG_PATH}. Skipping creation.")
