# Ai-Vtuber Project Context

This document outlines the core structure, technologies, and important considerations for the Ai-Vtuber project.

## Project Purpose

The Ai-Vtuber project aims to develop an application that integrates AI capabilities with virtual avatar technology, likely for streaming, content creation, or interactive experiences.

## Technology Stack

*   **Backend:** Python (core logic in `server/backend/main.py`)
*   **Frontend:** React, Vite (core files in `server/frontend/src/`)
*   **Styling:** CSS
*   **Package Management:** npm/yarn (indicated by `package.json`, `package-lock.json`)
*   **Linting:** ESLint (`eslint.config.js`)

## Directory Structure Overview

*   **`server/backend/`**: Contains the Python-based backend services and logic.
*   **`server/frontend/`**: Houses the React-based frontend application.
    *   **`public/`**: Static assets.
    *   **`src/`**: React source code.
        *   **`components/`**: Reusable UI components (e.g., `chat`, `header`, `input`).
        *   **`pages/`**: Top-level application views (e.g., `ChatHistory`, `Home`, `Settings`).
*   **Root Directory**: Contains project-level configurations like `.gitignore`, `.venv`, and main `package.json` files.

## Key Considerations for Future Development

*   The project follows a clear separation between the Python backend and the React frontend.
*   Frontend development utilizes modern React practices with Vite for efficient builds.
*   Component-based architecture is employed in the frontend for modularity.
*   Ensure any new development respects the existing structure and chosen technologies.
