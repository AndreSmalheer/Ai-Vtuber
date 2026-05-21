#!/bin/sh
python backend/setup.py
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
