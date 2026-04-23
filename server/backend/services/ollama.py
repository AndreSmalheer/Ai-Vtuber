import requests
import json
import re
import base64
import os

# Path to the config file for direct loading
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "config.json")

def load_runtime_config():
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, "r") as f:
                return json.load(f)
    except:
        pass
    return {}

def get_piper_audio(text, piper_url):
    if not text.strip():
        return None, None

    errors = []
    try:
        url = piper_url.rstrip("/")
        if not url.startswith("http"):
            url = f"http://{url}"
        
        print(f"Attempting Piper TTS: {url} with text: {text[:50]}...")
        
        # Try POST with JSON
        try:
            response = requests.post(url, json={"text": text}, timeout=5)
            if response.status_code == 200:
                print("Piper TTS success (POST JSON)")
                return base64.b64encode(response.content).decode("utf-8"), None
            else:
                errors.append(f"POST {response.status_code}")
        except Exception as e:
            errors.append(f"POST error: {str(e)}")

        # Try GET with query param
        try:
            response = requests.get(url, params={"text": text}, timeout=5)
            if response.status_code == 200:
                print("Piper TTS success (GET)")
                return base64.b64encode(response.content).decode("utf-8"), None
            else:
                errors.append(f"GET {response.status_code}")
        except Exception as e:
            errors.append(f"GET error: {str(e)}")
            
        err_msg = f"Piper TTS failed for {url}. Details: {', '.join(errors)}"
        print(err_msg)
        return None, err_msg
    except Exception as e:
        err_msg = f"Piper TTS critical error: {str(e)}"
        print(err_msg)
        return None, err_msg

def ollama_event_generator(user_message):
    # Load config fresh for every request
    config = load_runtime_config()
    
    ollama_url = config.get("ollama_url", "http://localhost:11434").rstrip("/")
    ollama_model = config.get("ollama_model", "qwen2.5-coder:1.5b-instruct")
    base_prompt = config.get("base_prompt", "")
    tts_enabled = config.get("tts_enabled", False)
    piper_url = config.get("piper_url", "http://localhost:10200")
    user_name = config.get("user_name", "You")
    ai_name = config.get("ai_name", "AI")

    print(f"Streaming request: tts_enabled={tts_enabled}, piper_url={piper_url}")

    # Get history for context
    from core.history import get_history, add_history
    prompt_context = get_history() + f"{user_name}: {user_message}\n{ai_name}:"

    payload = {
        "model": ollama_model,
        "prompt": (base_prompt + prompt_context) if base_prompt else prompt_context,
        "stream": True
    }

    try:
        response = requests.post(f"{ollama_url}/api/generate", json=payload, stream=True)
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
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
            # Check for sentence endings if TTS is enabled
            if tts_enabled and any(punct in chunk for punct in ".!?\n"):
                if re.search(r'[.!?](?:\s|$)|[\n]', sentence_buffer):
                    # Split by punctuation followed by space/end of string, or newline
                    # Keep the punctuation in the parts list
                    parts = re.split(r'([.!?](?:\s|$)|[\n])', sentence_buffer)
                    text_to_speak = ""
                    
                    # re.split with one capturing group returns: [text, punct, text, punct, ...]
                    for i in range(0, len(parts) - 1, 2):
                        sentence = parts[i] + parts[i+1]
                        if sentence.strip():
                            text_to_speak += sentence
                    
                    if text_to_speak.strip():
                        audio_data, tts_error = get_piper_audio(text_to_speak, piper_url)
                        # The last part of the split is what's left
                        sentence_buffer = parts[-1] if parts[-1] else ""

            yield f"data: {json.dumps({'text': chunk, 'audio': audio_data})}\n\n"

        if data.get("done"):
            # Process any remaining text in the buffer
            audio_data = None
            if tts_enabled and sentence_buffer.strip():
                audio_data, _ = get_piper_audio(sentence_buffer, piper_url)
            
            add_history(user_message, full_response)
            if audio_data:
                yield f"data: {json.dumps({'audio': audio_data})}\n\n"
            
            yield f"data: {json.dumps({'finish_reason': 'stop'})}\n\n"
