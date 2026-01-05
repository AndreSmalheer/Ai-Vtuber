import { configPromise } from "../config.js";

const config = await configPromise;

const TEXT_ANIMATION_SPEED_MS = config.textAnimationSpeedMs;
const FADE_OUT_DELAY = 1000;

let textQueue = "";
let isTyping = false;

export function showTextChunk(textSpan, chunk) {
  textQueue += chunk;

  if (isTyping) return;

  isTyping = true;

  (async function typeLoop() {
    while (textQueue.length > 0) {
      const char = textQueue[0];
      textQueue = textQueue.slice(1);

      textSpan.innerHTML += char;
      await new Promise((r) => setTimeout(r, TEXT_ANIMATION_SPEED_MS));
    }

    isTyping = false;
    textSpan.classList.remove("animate-text-ai-fade-out");
    void textSpan.offsetWidth;

    document.getElementById("ollama-text-debug").innerHTML = "";

    setTimeout(() => {
      textSpan.classList.add("animate-text-ai-fade-out");
    }, FADE_OUT_DELAY);
  })().catch(console.error);
}
