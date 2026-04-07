from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import time

router = APIRouter()

@router.get("/api/ollama")
def ollama():
    def stream_generator():
        for i in range(5):
            yield f"data: {{\"message\": \"chunk {i}\"}}\n\n"
            time.sleep(0.5)
        yield 'data: {"message": "completed"}\n\n'

    return StreamingResponse(stream_generator(), media_type="text/event-stream")
