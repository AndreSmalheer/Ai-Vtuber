from flask import Flask, render_template, request, Response, send_file, jsonify
import requests
import time
import json

from gtts import gTTS
import os
import uuid
import subprocess
from pathlib import Path


app = Flask(__name__, static_folder='public')


with open("config.json") as f:
    config = json.load(f)

ELECTRON_URL = config["ELECTRON_URL"]
GPT_SOVITS_URL = config["GPT_SOVITS_URL"]
PIPER_PATH = config["PIPER_PATH"]
VOICE_MODEL = config["VOICE_MODEL"]


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
    
def generate_fake_stream(prompt):
    time.sleep(3)

    fake_response = f"Rain tapped softly against the old café window. Clara stirred her coffee, watching the streets glisten under the dim streetlights."
    for char in fake_response:

        chunk = json.dumps({"text": char})  
        yield f"data: {chunk}\n\n"
        time.sleep(0.05)  

    yield f"data: {json.dumps({'finish_reason': 'stop'})}\n\n"

@app.route("/ollama_stream", methods=["POST"])
def ollama_stream():
    data = request.json
    prompt = data.get("prompt", "")
    return Response(generate_fake_stream(prompt), mimetype="text/event-stream")

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
