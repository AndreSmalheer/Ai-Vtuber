from flask import Flask, render_template, request, Response, send_file, jsonify
import requests
import time
import json
import os
import uuid
import subprocess
from pathlib import Path
from werkzeug.utils import secure_filename
import tempfile

app = Flask(__name__, static_folder='public')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VRM_FOLDER = os.path.join(BASE_DIR, "public/assets/vrm")
ANIMATIONS_FOLDER = os.path.join(BASE_DIR, "public/assets/animations")

if not os.path.exists(VRM_FOLDER):
    os.makedirs(VRM_FOLDER)


with open(os.path.join(BASE_DIR, "config.json")) as f:
    config = json.load(f)    

OLLAMA_URL = config["ollama"]["ollamaUrl"]
OLLAMA_MODEL = config["ollama"]["ollamaModel"]
BASE_PROMT = config["ollama"]["basePromt"]
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'public/assets/animations/')

@app.route('/api/animations/json')
def get_animation_json():
    json_file = os.path.join(BASE_DIR, "public","assets", "animations.json")

    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    return jsonify(data)

@app.route("/config")
def get_config():
    with open(os.path.join(BASE_DIR, "config.json")) as f:
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

    url = "http://172.25.241.250:8080"
    data = {"text": text}

    tts_response = requests.post(url, json=data)
    if tts_response.status_code != 200:
        return "TTS error", 500

    # Create temp WAV file
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    temp.write(tts_response.content)
    temp.flush()

    # Only send filename, not full path (safer)
    temp_name = Path(temp.name).name
    temp.close()

    # Return RAW audio bytes
    response = Response(
        tts_response.content,
        mimetype="audio/wav"
    )

    # Expose filename to browser
    response.headers["X-TTS-Filename"] = temp_name
    response.headers["Access-Control-Expose-Headers"] = "X-TTS-Filename"

    return response

def get_history():
    history_file = os.path.join(BASE_DIR, "public/assets/history.json")
    

    with open(history_file) as f:
     data = json.load(f)
     

    text_history = ""
    for msg in data:
        text_history += f"{msg['role'].capitalize()}: {msg['content']}\n"
    
    return text_history

def add_history(user_message, llm_message):
    history_file = os.path.join(BASE_DIR, "public/assets/history.json")


    if os.path.exists(history_file):
        with open(history_file, "r") as f:
            history = json.load(f)
    else:
        history = []

    history.append({"role": "User", "content": user_message})
    history.append({"role": "Ai", "content": llm_message})

    with open(history_file, "w") as f:
        json.dump(history, f, indent=2)

@app.route("/delete_tts", methods=["POST"])
def delete_tts():
    tts_dir = os.path.join(BASE_DIR, "public/assets/tts")

    if not Path(tts_dir).exists():
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
    prompt = get_history() + rf"User: {user_message}\AI:"

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
        requests.get("http://localhost:8123/show")
    except:
        pass
    return "OK"

@app.route("/hide_overlay")
def hide_overlay():
    try:
        requests.get("http://localhost:8123/hide")
    except:
        pass
    return "OK"

if __name__ == '__main__':
    app.run(debug=True, port=5000)