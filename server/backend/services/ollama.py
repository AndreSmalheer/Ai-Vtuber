import requests
import json
import re
import base64
import os
from backend.core.config import load_config as load_runtime_config

def generate_prompt(user_message):
    from backend.core.history import get_history, add_history

    config = load_runtime_config() or {}
    base_prompt = config.get("base_prompt", "")
    user_name = config.get("user_name", "You")
    ai_name = config.get("ai_name", "AI")

    prompt_context = get_history() or ""

    if base_prompt:
        result = base_prompt + prompt_context + f"{user_name}: {user_message}\n{ai_name}:"
        print("[DEBUG] Using base_prompt | Final prompt:", result, flush=True)
        return result
    else:
        result = prompt_context + f"{user_name}: {user_message}\n{ai_name}:"
        print("[DEBUG] No base_prompt | Final prompt:", result, flush=True)
        return result

def get_piper_audio(text, piper_url):
    if not text.strip():
        return None, None

    errors = []
    try:
        url = piper_url.rstrip("/")
        if not url.startswith("http"):
            url = f"http://{url}"

        print(f"Attempting Piper TTS: {url} with text: {text[:50]}...", flush=True)

        try:
            response = requests.post(url, json={"text": text}, timeout=5)
            if response.status_code == 200:
                print("Piper TTS success (POST JSON)", flush=True)
                return base64.b64encode(response.content).decode("utf-8"), None
            else:
                errors.append(f"POST {response.status_code}")
        except Exception as e:
            errors.append(f"POST error: {str(e)}")

        try:
            response = requests.get(url, params={"text": text}, timeout=5)
            if response.status_code == 200:
                print("Piper TTS success (GET)", flush=True)
                return base64.b64encode(response.content).decode("utf-8"), None
            else:
                errors.append(f"GET {response.status_code}")
        except Exception as e:
            errors.append(f"GET error: {str(e)}")

        err_msg = f"Piper TTS failed for {url}. Details: {', '.join(errors)}"
        print(err_msg, flush=True)
        return None, err_msg
    except Exception as e:
        err_msg = f"Piper TTS critical error: {str(e)}"
        print(err_msg, flush=True)
        return None, err_msg

def ollama_event_generator(user_message):
    from backend.core.history import get_history, add_history
    config = load_runtime_config()

    ollama_url = config.get("ollama_url", "http://localhost:11434").rstrip("/")
    ollama_model = config.get("ollama_model", "qwen2.5-coder:1.5b-instruct")
    base_prompt = config.get("base_prompt", "")
    tts_enabled = config.get("tts_enabled", False)
    stealth_mode = config.get("stealth_mode", False)
    piper_url = config.get("piper_url", "http://localhost:10200")
    user_name = config.get("user_name", "You")
    ai_name = config.get("ai_name", "AI")

    can_speak = tts_enabled and not stealth_mode

    print(f"Streaming request: tts_enabled={tts_enabled}, stealth_mode={stealth_mode}, can_speak={can_speak}", flush=True)

    prompt = generate_prompt(user_message)

    payload = {
        "model": ollama_model,
        "prompt": prompt,
        "stream": True
    }

    try:
        response = requests.post(f"{ollama_url}/api/generate", json=payload, stream=True)
    except Exception as e:
        print(f"Error connecting to Ollama: {e}", flush=True)
        yield f"data: {json.dumps({'error': str(e), 'finish_reason': 'error'})}\n\n"
        return

    full_response = ""
    sentence_buffer = ""

    for line in response.iter_lines():
        if not line:
            continue

        try:
            data = json.loads(line.decode("utf-8"))
        except:
            continue

        if "response" in data:
            chunk = data["response"]
            full_response += chunk
            sentence_buffer += chunk

            audio_data = None
            tts_error = None

            if can_speak and any(punct in chunk for punct in ".!?\n"):
                if re.search(r'[.!?](?:\s|$)|[\n]', sentence_buffer):
                    parts = re.split(r'([.!?](?:\s|$)|[\n])', sentence_buffer)
                    text_to_speak = ""

                    for i in range(0, len(parts) - 1, 2):
                        sentence = parts[i] + parts[i+1]
                        if sentence.strip():
                            text_to_speak += sentence

                    if text_to_speak.strip():
                        audio_data, tts_error = get_piper_audio(text_to_speak, piper_url)
                        sentence_buffer = parts[-1] if parts[-1] else ""

            yield f"data: {json.dumps({'text': chunk, 'audio': audio_data})}\n\n"

        if data.get("done"):
            audio_data = None
            if can_speak and sentence_buffer.strip():
                audio_data, _ = get_piper_audio(sentence_buffer, piper_url)

            add_history(user_message, full_response)
            if audio_data:
                yield f"data: {json.dumps({'audio': audio_data})}\n\n"

            yield f"data: {json.dumps({'finish_reason': 'stop'})}\n\n"

def get_ollama_response(text: str):
    config = load_runtime_config()

    ollama_url = config.get("ollama_url", "http://localhost:11434").rstrip("/")
    ollama_model = config.get("ollama_model", "qwen2.5-coder:1.5b-instruct")
    prompt = generate_prompt(text)

    try:
        response = requests.post(
            f"{ollama_url}/api/generate",
            json={
                "model": ollama_model,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )

        if response.status_code != 200:
            return ""

        data = response.json()
        return data.get("response", "")

    except Exception as e:
        return f"Error: {str(e)}"
