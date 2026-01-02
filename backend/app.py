from flask import Flask, render_template, request, Response, send_file, jsonify
import requests
import time
import json
import os
import uuid
import subprocess
from pathlib import Path
from werkzeug.utils import secure_filename


app = Flask(__name__, static_folder='public')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
VRM_FOLDER = os.path.join(BASE_DIR, "public/assets/vrm")
ANIMATIONS_FOLDER = os.path.join(BASE_DIR, "public/assets/animations")

if not os.path.exists(VRM_FOLDER):
    os.makedirs(VRM_FOLDER)


with open(os.path.join(BASE_DIR, "config.json")) as f:
    config = json.load(f)    

ELECTRON_URL = config["ELECTRON_URL"]
PIPER_PATH = config["PIPER_PATH"]
VOICE_MODEL = config["VOICE_MODEL"]
OLLAMA_URL = config["ollama"]["ollamaUrl"]
OLLAMA_MODEL = config["ollama"]["ollamaModel"]
BASE_PROMT = config["ollama"]["basePromt"]
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'public/assets/animations/')


@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/api/load_settings')
def load_settings():
    with open(os.path.join(BASE_DIR, "config.json"), 'r') as file:
        data = json.load(file)

    SETTINGS_DATA = {
        "ELECTRON_URL": data.get("ELECTRON_URL"),
        "WSL_HOME": data.get("WSL_HOME"),
        "PIPER_PATH": data.get("PIPER_PATH"),
        "VOICE_MODEL": data.get("VOICE_MODEL"),
        "defaultModelUrl": data.get("defaultModelUrl"),
        "animationUrls": data.get("animationUrls"),
        "eyeTrackingEnabled": data.get("eyeTrackingEnabled"),
        "blink": data.get("blink"),
        "blinkDuration": data.get("blinkDuration"),
        "ollama": {
            "ollamaUrl": data.get("ollama", {}).get("ollamaUrl"),
            "ollamaModel": data.get("ollama", {}).get("ollamaModel"),
            "ttsChunkThreshold": data.get("ollama", {}).get("ttsChunkThreshold"),
            "debug": data.get("ollama", {}).get("debug"),
            "basePromt": data.get("ollama", {}).get("basePromt")
        },
        "textAnimationSpeedMs": data.get("textAnimationSpeedMs"),
        "ttsMinBuffer": data.get("ttsMinBuffer"),
        "light_color": data.get("light_color"),
        "light_intensety": data.get("light_intensety")
    }

    return SETTINGS_DATA

@app.route('/api/load_vrm_models')
def load_vrm_models():
    vrm_files = [f for f in os.listdir(VRM_FOLDER) if f.endswith('.vrm')]

    return jsonify(vrm_files), 200

@app.route('/api/load_animations')
def load_animations():
    # List all FBX files in the folder
    fbx_files = [f for f in os.listdir(ANIMATIONS_FOLDER) if f.endswith('.fbx')]
    
    # Return as a list of objects so the frontend has the name and the path
    animation_data = []
    for f in fbx_files:
        animation_data.append({
            "name": f,
            "url": f"public/assets/animations/{f}"
        })
        
    return jsonify(animation_data), 200

@app.route('/api/animations/json')
def get_animation_json():
    json_file = os.path.join(BASE_DIR, "public","assets", "animations.json")

    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    return jsonify(data)

@app.route('/api/update_settings', methods=['POST'])
def update_settings():
    ELECTRON_URL = request.form.get('ELECTRON_URL')
    WSL_HOME = request.form.get('WSL_HOME')
    PIPER_PATH = request.form.get('PIPER_PATH')
    VOICE_MODEL = request.form.get('VOICE_MODEL')
    DEFAULT_MODEL_URL = request.form.get('defaultModelUrl')
    ANIMATIONS_URLS = request.form.getlist('animationUrls')

    EYE_TRACKING = request.form.get('eyeTrackingEnabled') == 'on'
    BLINK = request.form.get('blink') == 'on'
    DEBUG = request.form.get('DEBUG_MODE') == 'on'

    def to_int(val): return int(val) if val and str(val).isdigit() else 0
    def to_float(val): 
        try: return float(val)
        except: return 0.0

    FBX_FILES = request.files.getlist('animations')
    for file in FBX_FILES:
        if file.filename:
            name = secure_filename(file.filename)
            save_path = os.path.join(UPLOAD_FOLDER, name)
            file.save(save_path)
            new_url = f"public/assets/animations/uploaded/{name}"
            if new_url not in ANIMATIONS_URLS:
                ANIMATIONS_URLS.append(new_url)


    if 'vrm_file' in request.files:
        vrm_file = request.files['vrm_file']
        if vrm_file.filename != '':
            vrm_name = secure_filename(vrm_file.filename)
            vrm_save_path = os.path.join(VRM_FOLDER, vrm_name)
            vrm_file.save(vrm_save_path)
            DEFAULT_MODEL_URL = vrm_name            

    # --- 4. STRUCTURE DATA ---
    SETTINGS_DATA = {
        "ELECTRON_URL": ELECTRON_URL,
        "WSL_HOME": WSL_HOME,
        "PIPER_PATH": PIPER_PATH,
        "VOICE_MODEL": VOICE_MODEL,
        "defaultModelUrl": f"public/assets/vrm/{DEFAULT_MODEL_URL}",
        "animationUrls": ANIMATIONS_URLS,
        "eyeTrackingEnabled": EYE_TRACKING,
        "blink": BLINK,
        "blinkDuration": to_float(request.form.get('blinkDuration')),
        "ollama": {
            "ollamaUrl": request.form.get('OLLAMA_URL'),
            "ollamaModel": request.form.get('OLLAMA_MODEL'),
            "ttsChunkThreshold": to_int(request.form.get('TTS_CHUNK_THRESHOLD')),
            "debug": DEBUG,
            "basePromt": request.form.get('BASE_PROMPT')
        },
        "textAnimationSpeedMs": to_int(request.form.get('TEXT_ANIMATION_SPEED_MS')),
        "ttsMinBuffer": to_int(request.form.get('ttsMinBuffer')),
        "light_color": request.form.get('light_color'),
        "light_intensety": to_float(request.form.get('light_intensety'))
    }

    # print("\n" + "="*60)
    # print("                SAVING UPDATED SETTINGS")
    # print("="*60)
    # # This prints it like a beautiful JSON object in your terminal
    # print(json.dumps(SETTINGS_DATA, indent=2))
    # print("="*60 + "\n")

    with open(os.path.join(BASE_DIR, "config.json"), 'w', encoding='utf-8') as f:
        json.dump(SETTINGS_DATA, f, indent=2)

    return jsonify({"status": "success", "message": "Settings saved to disk"}), 200

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

    history.append({"role": "andre", "content": user_message})
    history.append({"role": "mia", "content": llm_message})

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