import * as THREE from "three";

export let audioContext, analyser, audioSource, audioElement;
export let lipSyncActive = false;
export const lipSyncData = new Uint8Array(128);

export function playAudioWithLipSync(mp3Url, currentVrm, onEnded) {
  if (!currentVrm) return;

  if (!audioContext) audioContext = new AudioContext();

  audioElement = new Audio(mp3Url);
  audioElement.crossOrigin = "anonymous";

  audioSource = audioContext.createMediaElementSource(audioElement);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  audioSource.connect(analyser);
  analyser.connect(audioContext.destination);

  audioElement.play();
  lipSyncActive = true;

  audioElement.onended = () => {
    lipSyncActive = false;
    currentVrm.expressionManager.setValue("aa", 0);
    currentVrm.expressionManager.setValue("oh", 0);
    currentVrm.expressionManager.setValue("ee", 0);

    if (onEnded) onEnded();
  };

  audioElement.onerror = (err) => {
    console.error("Audio playback error:", err);
    lipSyncActive = false;
    if (onEnded) onEnded();
  };
}

export function updateLipSync(vrm) {
  if (!lipSyncActive || !vrm || !analyser) return;

  analyser.getByteFrequencyData(lipSyncData);
  let sum = 0;
  for (let i = 0; i < lipSyncData.length; i++) sum += lipSyncData[i];

  const volume = sum / lipSyncData.length / 255;
  const mouthOpen = THREE.MathUtils.clamp(volume * 2.5, 0, 1);

  vrm.expressionManager.setValue("aa", mouthOpen);
  vrm.expressionManager.setValue("oh", mouthOpen * 0.5);
  vrm.expressionManager.setValue("ee", mouthOpen * 0.3);
}
