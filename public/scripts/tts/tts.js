import { playAudioWithLipSync } from "../lipSync/lipSync.js";

export const callTTS = (() => {
  const textQueue = [];
  const audioQueue = [];
  const playedAudioLog = [];

  let isPlaying = false;
  let isGenerating = false;

  const MIN_BUFFER = 3;

  const generateAudioIfNeeded = async () => {
    if (isGenerating) return;
    if (audioQueue.length >= MIN_BUFFER) return;
    if (textQueue.length === 0) return;

    isGenerating = true;

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

        const filename = resp.headers.get("X-TTS-Filename") || null;

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);

        audioQueue.push({ text, url: blobUrl, filename });

        console.log(
          "Generated and queued audio for:",
          text,
          filename ? `as ${filename}` : `(no filename header)`
        );

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
      console.error("No audio URL found for queue item, skipping:", {
        text,
        filename,
      });
      setTimeout(playNext, 0);
      return;
    }

    const displayName = filename || url;
    playedAudioLog.push(displayName);

    console.log("Playing TTS:", text, "-", displayName);

    playAudioWithLipSync(url, window.vrm, () => {
      console.log("Finished TTS:", text, "-", displayName);

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
