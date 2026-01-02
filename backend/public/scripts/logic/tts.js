import { playAudioWithLipSync } from "../ui/VRM/lipSync.js";
import { configPromise } from "../config.js";

const config = await configPromise;
const MIN_BUFFER = config.ttsMinBuffer;

const ttsQueue = [];
let playing = false;

async function processTTSQueue() {
  if (playing) return;
  if (ttsQueue.length === 0) return;

  playing = true;
  const text = ttsQueue.shift();

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/say?text=${encodeURIComponent(text)}`
    );
    if (!response.ok) throw new Error("TTS request failed");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    playAudioWithLipSync(url, window.vrm, () => {
      URL.revokeObjectURL(url);
      playing = false;
      processTTSQueue();
    });
  } catch (err) {
    console.error("Error fetching TTS audio:", err);
    playing = false;
    processTTSQueue();
  }
}
export async function callTTS(input) {
  ttsQueue.push(input);
  processTTSQueue();
}
