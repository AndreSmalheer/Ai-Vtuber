from flask import Flask, render_template, request, Response, send_file, jsonify
import requests
import time
import json
import os
import uuid
import subprocess
from pathlib import Path


app = Flask(__name__, static_folder='public')


with open("config.json") as f:
    config = json.load(f)

ELECTRON_URL = config["ELECTRON_URL"]
PIPER_PATH = config["PIPER_PATH"]
VOICE_MODEL = config["VOICE_MODEL"]
OLLAMA_URL = config["ollama"]["ollamaUrl"]
OLLAMA_MODEL = config["ollama"]["ollamaModel"]
BASE_PROMT = config["ollama"]["basePromt"]

@app.route('/settings')
def settings():
    return render_template('settings.html')


@app.route("/config")
def get_config():
    with open("config.json") as f:
        config = json.load(f)
    return jsonify(config)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/overlay')
def overlay():
    return render_template('overlay.html')

@app.route("/say")
def say():
    text = request.args.get("text")
    if not text:
        return "Please provide ?text=...", 400

    # Output file
    output_file = Path("public/assets/tts") / f"tts_{uuid.uuid4().hex}.wav"
    output_file = output_file.resolve() 

    # Convert Windows path → WSL path (for WSL execution)
    drive = output_file.drive[0].lower()
    wsl_output_file = f"/mnt/{drive}{output_file.as_posix()[2:]}"

    try:
        subprocess.run(
            [
                "wsl",
                PIPER_PATH,
                "--model", VOICE_MODEL,
                "--output_file", wsl_output_file
            ],
            input=text.encode("utf-8"),
            check=True
        )
    except subprocess.CalledProcessError as e:
        return f"Piper TTS failed: {e}", 500

    response = send_file(
        output_file,
        mimetype="audio/wav",
        as_attachment=False
    )
    response.headers["X-TTS-Filename"] = output_file.name
    return response

@app.route("/status_piper")
def status_piper():
    piper_path = request.args.get("piper_path")
    voice_model = request.args.get("voice_model")
    
    if not piper_path or not voice_model:
        return {"visible": False, "error": "Missing piper_path or voice_model"}, 400

    test_text = "Testing Piper connection"
    try:
        # Output file (temporary, discard)
        output_file = Path("/tmp/test.wav")
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Convert Windows path → WSL path
        drive = output_file.drive[0].lower() if output_file.drive else "c"
        wsl_output_file = f"/mnt/{drive}{output_file.as_posix()[2:]}"
        
        # Run Piper via WSL
        subprocess.run(
            [
                "wsl",
                piper_path,
                "--model", voice_model,
                "--output_file", wsl_output_file
            ],
            input=test_text.encode("utf-8"),
            check=True
        )
        return {"visible": True}
    except subprocess.CalledProcessError as e:
        return {"visible": False, "error": str(e)}, 500
    
def get_history():
    history_file = "./public/assets/history.json"

    with open(history_file) as f:
     data = json.load(f)
     

    text_history = ""
    for msg in data:
        text_history += f"{msg['role'].capitalize()}: {msg['content']}\n"
    
    return text_history

def add_history(user_message, llm_message):
    history_file = "./public/assets/history.json"

    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            history = json.load(f)
    else:
        history = []

    history.append({"role": "andre", "content": user_message})
    history.append({"role": "mia", "content": llm_message})

    with open(history_file, "w") as f:
        json.dump(history, f, indent=2)

@app.route("/delete_tts", methods=["POST"])
def delete_tts():
    if not Path("public/assets/tts").exists():
        return jsonify({"status": "error", "message": "TTS directory not found"}), 404

    data = request.get_json(silent=True)
    if not data or "files" not in data:
        return jsonify({
            "status": "error",
            "message": "A 'files' list is required",
            "code": 400
        }), 400

    files_to_delete = data["files"]
    if not isinstance(files_to_delete, list) or not files_to_delete:
        return jsonify({
            "status": "error",
            "message": "'files' must be a non-empty list",
            "code": 400
        }), 400

    deleted = []
    failed = []

    for fname in files_to_delete:
        tts_dir = Path("public/assets/tts")
        fpath = tts_dir / fname
        if fpath.exists():
            try:
                fpath.unlink()
                deleted.append(fname)
            except Exception as e:
                failed.append({"file": fname, "error": str(e)})
        else:
            failed.append({"file": fname, "error": "File not found"})


    if failed:
        return jsonify({
            "status": "partial_failed",
            "deleted": deleted,
            "failed": failed,
            "code": 207
        }), 207
    else:
        return jsonify({
            "status": "success",
            "deleted": deleted,
            "failed": failed,
            "code": 200
        })
    
def generate_ollama_stream(user_message):
    prompt = get_history() + f"Andre: {user_message}\nMia:"

    if BASE_PROMT != "":
     payload = {
         "model": OLLAMA_MODEL,
         "prompt": BASE_PROMT + prompt,
         "stream": True
     }
    else:
        payload = {
         "model": OLLAMA_MODEL,
         "prompt": prompt,
         "stream": True
     }

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json=payload,
        stream=True
    )

    full_response = ""

    for line in response.iter_lines():
        if not line:
            continue

        decoded = line.decode("utf-8")

        try:
            data = json.loads(decoded)
        except json.JSONDecodeError:
            continue

        if "response" in data:
            full_response += data['response']
            yield f"data: {json.dumps({'text': data['response']})}\n\n"

        if data.get("done"):
            add_history(user_message, full_response)

    yield f"data: {json.dumps({'finish_reason': 'stop'})}\n\n"

@app.route("/ollama_stream", methods=["POST"])
def ollama_stream():
    data = request.json
    prompt = data.get("prompt", "")
    return Response(generate_ollama_stream(prompt), mimetype="text/event-stream")

@app.route("/show_overlay")
def show_overlay():
    try:
        requests.get(f"{ELECTRON_URL}/show")
    except:
        pass
    return "OK"

@app.route("/hide_overlay")
def hide_overlay():
    try:
        requests.get(f"{ELECTRON_URL}/hide")
    except:
        pass
    return "OK"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
