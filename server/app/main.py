from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .routes import router

app = FastAPI()

public_dir = Path(__file__).resolve().parent.parent / "public"
app.mount("/static", StaticFiles(directory=public_dir), name="static")
app.mount("/public", StaticFiles(directory=public_dir), name="public")

app.include_router(router)
