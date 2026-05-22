from pywebpush import WebPushException, webpush
import json
import os
import sys
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(SCRIPT_DIR)

dotenv_path = os.path.join(SCRIPT_DIR, '..', '..', '.env')
load_dotenv(dotenv_path)

SUBSCRIPTIONS_FILE = os.path.join(SCRIPT_DIR, '..', 'data', 'subscriptions.json')

VAPID_PUBLIC_KEY_BACKEND = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY_BACKEND = os.getenv("VAPID_PRIVATE_KEY")
VAPID_MAILTO_URL = os.getenv("VAPID_SUBJECT", "mailto:your-email@example.com")

if not VAPID_PUBLIC_KEY_BACKEND or not VAPID_PRIVATE_KEY_BACKEND:
    print("Warning: VAPID keys not found in environment. Push notifications may fail.")
    print("Please run server/backend/setup.py to generate them.")

def save_subscriptions(subscriptions):
    try:
        with open(SUBSCRIPTIONS_FILE, "w") as f:
            json.dump(subscriptions, f, indent=4)
    except Exception as e:
        print(f"Error saving subscriptions: {e}")

async def send_push_internal(title: str, message: str, url: str = "/"):
    subscriptions = load_subscriptions()

    if not subscriptions:
        return

    payload = json.dumps({
        "title": title,
        "message": message,
        "url": url,
        "icon": "/pwa-192x192.png",
        "badge": "/pwa-192x192.png",
    })

    sent_count = 0
    stale_endpoints = set()

    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY_BACKEND,
                vapid_claims={"sub": VAPID_MAILTO_URL},
                ttl=60,
            )
            sent_count += 1

        except WebPushException as e:
            response = getattr(e, "response", None)

            if getattr(response, "status_code", None) in (404, 410):
                stale_endpoints.add(sub.get("endpoint"))

    if stale_endpoints:
        save_subscriptions([
            sub for sub in subscriptions
            if sub.get("endpoint") not in stale_endpoints
        ])

    return sent_count

def load_subscriptions():
    if not os.path.exists(SUBSCRIPTIONS_FILE):
        return []
    try:
        with open(SUBSCRIPTIONS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        print(f"Warning: Could not load or decode {SUBSCRIPTIONS_FILE}. Returning empty list.")
        return []
