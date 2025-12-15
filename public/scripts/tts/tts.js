import { playAudioWithLipSync } from "../lipSync/lipSync.js";

function error_animate(errors) {
  const existingDiv = document.getElementById("error_container");
  if (existingDiv) {
    existingDiv.remove();
  }

  const div = document.createElement("div");
  div.id = "error_container";
  div.innerHTML = "";

  for (const error of errors) {
    div.innerHTML += error;
  }

  document.body.appendChild(div);
}

export const callTTS = (() => {
  const ttsQueue = [];
  let isPlaying = false;

  const playNext = async () => {
    if (ttsQueue.length === 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const nextInput = ttsQueue.shift();

    console.log("Processing TTS:", nextInput);

    try {
      const response = await fetch("http://127.0.0.1:5000/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Example",
          infer_text: nextInput,
          output_lan: "en",
        }),
      });

      const payload = await response.json();
      const code = response.status;

      if (!response.ok) {
        console.error("TTS request failed:", payload);
        error_animate(payload);
      } else {
        console.log("TTS request succeeded for:", nextInput, payload);
        playNext();
      }
    } catch (err) {
      console.error("Error calling TTS:", err);
    }
  };

  return (input) => {
    console.log("Queueing TTS for:", input);
    ttsQueue.push(input);
    if (!isPlaying) playNext();
  };
})();
