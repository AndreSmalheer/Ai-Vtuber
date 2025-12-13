import * as THREE from "three";
import { lipSyncActive, lipSyncData, analyser } from "./lipSync.js";

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
