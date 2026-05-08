import os
import subprocess
import sys

VENV_DIR = "backend/.venv"

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
