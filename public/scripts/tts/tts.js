import { playAudioWithLipSync } from "../lipSync/lipSync.js";
import { configPromise } from "../config.js";

const config = await configPromise;
const MIN_BUFFER = config.ttsMinBuffer;

export const callTTS = (() => {
  const textQueue = [];
  const audioQueue = [];
  const playedAudioLog = [];

  let isPlaying = false;
  let isGenerating = false;

  const generateAudioIfNeeded = async () => {
    if (isGenerating) return;
    if (audioQueue.length >= MIN_BUFFER) return;
    if (textQueue.length === 0) return;

    isGenerating = true;
    const shouldStartAfterFirst = !isPlaying && audioQueue.length === 0;

    while (audioQueue.length < MIN_BUFFER && textQueue.length > 0) {
      const text = textQueue.shift();
      const ttsUrl = `http://127.0.0.1:5000/say?text=${encodeURIComponent(
        text
      )}`;

      try {
        const resp = await fetch(ttsUrl);
        if (!resp.ok) {
          show_error(`TTS failed for: "${text}"`);
          continue;
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const filename = resp.headers.get("X-TTS-Filename");

        audioQueue.push({ text, url: blobUrl, filename });

        if (shouldStartAfterFirst && audioQueue.length > 0) {
          playNext();
        }
      } catch (err) {
        show_error(`Problem generating audio for: "${text}"`);
      }
    }

    isGenerating = false;
  };

  const playNext = () => {
    if (audioQueue.length === 0) {
      if (textQueue.length === 0 && !isGenerating) {
        console.log("✅ TTS LOOP FINISHED (all text spoken)");
        console.log("📜 Played audio files:", playedAudioLog);

        fetch("http://127.0.0.1:5000/delete_tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: playedAudioLog }),
        })
          .then((res) => res.json())
          .then((data) => console.log("Deleted files:", data.deleted))
          .catch(console.error);
      } else {
        generateAudioIfNeeded();
      }

      isPlaying = false;
      return;
    }

    isPlaying = true;
    const { text, url, filename } = audioQueue.shift();

    if (!url) {
      show_error(`Audio missing for: "${text}"`);
      setTimeout(playNext, 0);
      return;
    }

    const displayName = filename || "unknown_file";
    playedAudioLog.push(displayName);

    playAudioWithLipSync(url, window.vrm, () => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore revoke errors
      }

      generateAudioIfNeeded();
      playNext();
    });
  };

  return (input) => {
    if (!input || typeof input !== "string") {
      console.warn("callTTS expects a non-empty string input.");
      return;
    }

    textQueue.push(input);
    void generateAudioIfNeeded();

    if (!isPlaying && audioQueue.length > 0) {
      playNext();
    }
  };
})();
