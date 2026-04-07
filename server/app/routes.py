from fastapi import APIRouter
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter()

INDEX_FILE = Path(__file__).resolve().parent.parent / "public" / "pages" / "chat+character" / "index.html"

@router.get("/", response_class=FileResponse)
def home():
    if INDEX_FILE.exists():
        return INDEX_FILE
    return {"error": "index.html not found"}
