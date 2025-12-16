import { playAudioWithLipSync } from "../lipSync/lipSync.js";

export const callTTS = (() => {
  const textQueue = [];
  const audioQueue = [];

  let isPlaying = false;
  let isGenerating = false;

  const MIN_BUFFER = 3;

  const generateAudioIfNeeded = async () => {
    if (isGenerating) return;
    if (audioQueue.length >= MIN_BUFFER) return;
    if (textQueue.length === 0) return;

    isGenerating = true;

    // If playback hasn't started yet and we have no audio, we'll want to start
    const shouldStartAfterFirst = !isPlaying && audioQueue.length === 0;

    while (audioQueue.length < MIN_BUFFER && textQueue.length > 0) {
      const text = textQueue.shift();
      console.log("Generating TTS audio for:", text);

      const ttsUrl = `http://127.0.0.1:5000/say?text=${encodeURIComponent(
        text
      )}`;

      try {
        const resp = await fetch(ttsUrl);
        if (!resp.ok) {
          console.error(
            `TTS endpoint error for "${text}":`,
            resp.status,
            resp.statusText
          );
          continue;
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);

        audioQueue.push({ text, url: blobUrl });
        console.log("Generated and queued audio for:", text);

        // If playback hasn't started, start it as soon as we have at least one file
        if (shouldStartAfterFirst && audioQueue.length > 0) {
          playNext();
        }
      } catch (err) {
        console.error("Error fetching TTS audio for:", text, err);
      }
    }

    isGenerating = false;
  };

  const playNext = () => {
    if (audioQueue.length === 0) {
      // No generated audio available.
      if (textQueue.length > 0) generateAudioIfNeeded();
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const { text, url } = audioQueue.shift();

    console.log("Playing TTS:", text);

    playAudioWithLipSync(url, window.vrm, () => {
      console.log("Finished TTS:", text);

      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignoring revoke errors
      }

      generateAudioIfNeeded();

      playNext();
    });
  };

  // public function: enqueue text for TTS
  return (input) => {
    if (!input || typeof input !== "string") {
      console.warn("callTTS expects a non-empty string input.");
      return;
    }

    // console.log("Queueing TTS for:", input);
    // textQueue.push(input);

    void generateAudioIfNeeded();

    if (!isPlaying && audioQueue.length > 0) {
      playNext();
    }
  };
})();
