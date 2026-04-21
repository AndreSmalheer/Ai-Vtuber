import os
import json

from datetime import datetime

HISTORY_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "history.json")

def get_history_list():
    if not os.path.exists(HISTORY_PATH):
        return []
    
    try:
        with open(HISTORY_PATH, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def get_history():
    history = get_history_list()
    
    formatted_history = ""
    for entry in history:
        formatted_history += f"{core.config.USER_NAME}: {entry['user']}\n{core.config.AI_NAME}: {entry['ai']}\n"
    return formatted_history

def delete_history():
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "w") as f:
                json.dump([], f, indent=4)
            return True
        except Exception:
            return False
    return True

def delete_message(index):
    history = get_history_list()
    if 0 <= index < len(history):
        history.pop(index)
        os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
        with open(HISTORY_PATH, "w") as f:
            json.dump(history, f, indent=4)
        return True
    return False

def add_history(user_message, full_response):
    history = []
    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r") as f:
                history = json.load(f)
        except json.JSONDecodeError:
            history = []
    
    history.append({
        "user": user_message, 
        "ai": full_response,
        "timestamp": datetime.now().isoformat()
    })
    
    # Optional: Keep only last 10 messages to prevent context overflow
    if len(history) > 10:
        history = history[-10:]
        
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, "w") as f:
        json.dump(history, f, indent=4)
