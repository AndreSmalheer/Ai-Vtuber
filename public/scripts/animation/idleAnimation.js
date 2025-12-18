import { lipSyncActive, lipSyncData, analyser } from "../lipSync/lipSync.js";
import * as THREE from "three";
import { configPromise } from "../config.js";
const config = await configPromise;

const minAnimationInterval = config.animation.minAnimationInterval;
const maxAnimationInterval = config.animation.maxAnimationInterval;
let isAnimating = config.animation.isAnimating;

let nextAnimationTime = 0;

export function updateRandomIdle(vrm, loadedActions, clock) {
  // if (!vrm || isAnimating || Object.keys(loadedActions).length === 0) return;
  // const time = clock.elapsedTime;
  // if (time <= nextAnimationTime) return;
  // isAnimating = true;
  // const keys = Object.keys(loadedActions);
  // const randomKey = keys[Math.floor(Math.random() * keys.length)];
  // const action = loadedActions[randomKey];
  // action.reset();
  // action.setLoop(THREE.LoopOnce, 0);
  // action.clampWhenFinished = true;
  // action.play();
  // const duration = action._clip.duration;
  // setTimeout(() => {
  //   isAnimating = false;
  //   nextAnimationTime =
  //     time +
  //     duration +
  //     minAnimationInterval +
  //     Math.random() * (maxAnimationInterval - minAnimationInterval);
  // }, duration * 1000);
}
