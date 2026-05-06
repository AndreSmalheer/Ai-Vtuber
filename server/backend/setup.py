import os
import subprocess
import sys

VENV_DIR = ".venv"

if not os.path.exists(VENV_DIR):
    print("Creating virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", VENV_DIR])

pip_path = os.path.join(VENV_DIR, "Scripts", "pip")
print(pip_path)

print("Installing Python dependencies...")
result = subprocess.run(
    [pip_path, "install", "-r", "backend/requirements.txt"],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("Python environment ready.")
else:
    print("Error occurred while installing Python dependencies.")
    print(result.stderr)
