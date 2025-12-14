from flask import Flask, render_template, request, Response, send_file
import requests
import time
import json

from gtts import gTTS
import os
import uuid



app = Flask(__name__, static_folder='public')
ELECTRON_URL = "http://localhost:8123"

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


    filename = os.path.join(os.getcwd(),  "public/assets/tts",  f"tts_{uuid.uuid4().hex}.mp3")
    tts = gTTS(text=text, lang='en')
    tts.save(filename)

    return send_file(filename, mimetype="audio/mpeg")



def generate_fake_stream(prompt):
    time.sleep(3)

    fake_response = f"Simulated streaming Ollama response for: {prompt}"
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
