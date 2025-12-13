import { lipSyncActive, lipSyncData, analyser } from "../lipSync/lipSync.js";
import * as THREE from "three";

let nextAnimationTime = 0;
const minAnimationInterval = 1;
const maxAnimationInterval = 8;
let isAnimating = false;

export function updateRandomIdle(vrm, loadedActions, clock) {
  if (
    !vrm ||
    isAnimating ||
    lipSyncActive ||
    Object.keys(loadedActions).length === 0
  )
    return;
  const time = clock.elapsedTime;
  if (time <= nextAnimationTime) return;

  isAnimating = true;
  const keys = Object.keys(loadedActions);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const action = loadedActions[randomKey];
  action.reset();
  action.setLoop(THREE.LoopOnce, 0);
  action.clampWhenFinished = true;
  action.play();

  const duration = action._clip.duration;
  setTimeout(() => {
    isAnimating = false;
    nextAnimationTime =
      time +
      duration +
      minAnimationInterval +
      Math.random() * (maxAnimationInterval - minAnimationInterval);
  }, duration * 1000);
}
