# Ai-Vtuber Project Context

This document outlines the core structure, technologies, and current status of the Ai-Vtuber project.

## Project Purpose

The Ai-Vtuber project is an AI-driven virtual avatar application that integrates local Large Language Models (LLMs) with a 3D avatar interface for interactive experiences.

## Technology Stack

*   **Backend:** 
    *   **Python (FastAPI):** Main API server in `server/backend/main.py`.
    *   **Ollama:** Local LLM inference engine integrated via `requests`.
*   **Frontend:** 
    *   **React + Vite:** Core application logic and build tool.
    *   **Three.js:** Utilized for the 3D avatar rendering (currently a placeholder).
*   **Styling:** Vanilla CSS for component-based modularity.
*   **Data Persistence:** Local JSON files for configuration (`config.json`) and conversation history (`history.json`).

## Directory Structure Overview

*   **`server/backend/`**:
    *   **`main.py`**: Entry point defining FastAPI endpoints for configuration, chat, and history.
    *   **`core/`**: Configuration management (`config.py`) and history logic (`history.py`).
    *   **`services/`**: External integrations, specifically `ollama.py` for streaming LLM responses.
    *   **`data/`**: Storage for JSON-based state.
*   **`server/frontend/`**:
    *   **`src/components/`**:
        *   **`chat/`**: Implements SSE-based streaming response display with configurable speed.
        *   **`avatar/`**: Contains the Three.js container for the 3D model (VRM/GLB loading pending).
    *   **`src/pages/`**: Includes `Home`, `ChatHistory`, and `Settings` views.

## Current Project Status

*   **LLM Integration:** Functional streaming via Ollama. History is appended to every prompt for context.
*   **Frontend UX:** Dynamic chat interface with fade-in/out animations and real-time streaming feedback.
*   **Avatar:** A skeleton `Avatar` component exists but does not yet load or animate 3D models.
*   **Configuration:** Global settings (speed, base prompt, model name) are persistent across sessions.

## Key Considerations & Future Roadmap

*   **3D Model Loading:** Implement `@pixiv/three-vrm` to load and animate industry-standard VTuber models.
*   **Lip-Sync & Audio:** Integrate TTS (Text-to-Speech) and map audio data to avatar blendshapes for realistic speech.
*   **Emotion Detection:** Analyze LLM outputs to trigger avatar expressions (Joy, Sadness, etc.).
*   **State Management:** Migrated from hardcoded URLs (localhost:8000) to relative paths via Vite proxy. Backend now listens on `0.0.0.0` for local network access.
*   **Robustness:** Transition from JSON file storage to a more scalable database if multi-session or complex history management is required.
