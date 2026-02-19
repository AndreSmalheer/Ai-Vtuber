# AI Vtuber

This project creates a Vtuber on
your desktop and web. It integrates
Ollama and text-to-speech from Piper. You can
customize settings by modify the
`backend/config.json` file.

---
**Installation Instructions:**

1.  **Clone the Repository:**
    ```
    https://github.com/AndreSmalheer/Ai-Vtuber
    ```

2. **Change diractery**
    ```
   cd Ai-Vtuber
    ```

3.  **Install NPM Packages:**
    ```
    npm install
    ```

4.  **Install Python Dependencies:**  Choose one of the
following methods:

    *   **Virtual Environment (Recommended):**
        ```bash
        python3.14 -m venv venv
        .\venv\Scripts\activate
        pip install -r requirements.txt
        ```
    *   **Local Install:**
        ```bash
        pip install -r requirements.txt
        ```

5.  **Configure Settings:**  Modify the
`backend/config.json` file.:

    ```json
    {
      "piperUrl": "Change this to your piper URL",
      "ollamaUrl": "Change this to your Ollama URL",
      "ollamaModel": "Change this to your Ollama Model",
    }
    ```

    **Note:** If you don't have Ollama or Piper installed,
refer to their respective GitHub repositories for
installation instructions:

    *   **Ollama:**
            https://github.com/ollama/ollama
    *   **Piper TTS:** (Make sure to install an api server)
            https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/API_HTTP.md

6. **Start the aplication**
    ```
    npm start
    ```

---

# Technologies Used

* Electron
* node js
* Flask
* Three js
