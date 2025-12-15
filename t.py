import requests

payload = {
    "text": "this is a test",
    "text_lang": "en",
    "ref_audio_path": "C:/Projects/Companion-AI/models/Example/ref_audio.ogg",
    "prompt_lang": "en",
    "prompt_text": "You've been all over, so you must've seen a lot. When you've got the time, tell me your story, yea?",
    "streaming_mode": True
}

r = requests.post("http://127.0.0.1:9880/tts", json=payload, timeout=120)
print(r.status_code)
print(r.text[:200])  # only first 200 chars
