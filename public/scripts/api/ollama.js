import { showTextChunk } from "../text-animations/textAnimator.js";
import { callTTS } from "../tts/tts.js";
import { configPromise } from "../config.js";

const config = await configPromise;
const OLLAMA_STREAM_URL = "http://127.0.0.1:5000/ollama_stream";
const TTS_CHUNK_THRESHOLD = config.ollama.ttsChunkThreshold;
const DEBUG = config.ollama.debug;

export async function streamOllamaResponse(textSpan, prompt) {
  try {
    textSpan.innerHTML = "Loading";
    textSpan.classList.add("loading");

    const response = await fetch(OLLAMA_STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let firstChunk = true;
    let chunks = [];
    let currentChunk = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          let data;
          try {
            data = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (data.finish_reason === "stop") continue;

          if (firstChunk) {
            textSpan.innerHTML = "";
            textSpan.classList.remove("loading");
            firstChunk = false;
          }

          if (DEBUG) {
            const container = document.getElementById("ollama-text-debug");
            container.innerHTML += data.text;
          }

          showTextChunk(textSpan, data.text);

          for (const char of data.text) {
            currentChunk += char;
            if (char === " " || [".", "!", "?"].includes(char)) {
              chunks.push(currentChunk);
              currentChunk = "";

              if (
                chunks.length >= TTS_CHUNK_THRESHOLD ||
                [".", "!", "?"].includes(char)
              ) {
                callTTS(chunks.join(" "));
                chunks = [];
              }
            }
          }
        }
      }
    }

    if (currentChunk.length > 0) chunks.push(currentChunk);
    if (chunks.length > 0) callTTS(chunks.join(""));
  } catch (err) {
    console.error("streamOllamaResponse error:", err);
    textSpan.classList.remove("loading");
    textSpan.innerHTML = `Error: ${err.message}`;
  } finally {
    textSpan.classList.remove("loading");
  }
}
