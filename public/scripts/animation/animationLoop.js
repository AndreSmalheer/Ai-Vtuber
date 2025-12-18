// import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
// import { lipSyncActive, lipSyncData, analyser } from "../lipSync/lipSync.js";
import { updateBlink } from "./blink.js";
import { updateRandomIdle } from "./idleAnimation.js";
import { updateLipSync } from "../lipSync/lipSyncUpdate.js";
import { setIdlePose } from "./natruelPose.js";
import { configPromise } from "/public/scripts/config.js";

const config = await configPromise;
const defaultPose = config.defaultPose;

export function animate(
  clock,
  mixer,
  vrm,
  renderer,
  scene,
  camera,
  loadedActions,
  lookAtTarget
) {
  setIdlePose(vrm, mixer, defaultPose);
  function loop() {
    requestAnimationFrame(loop);
    const deltaTime = clock.getDelta();
    if (mixer) mixer.update(deltaTime);

    updateBlink(vrm, clock);
    updateRandomIdle(vrm, loadedActions, clock);
    updateLipSync(vrm);

    vrm.update(deltaTime);

    if (vrm) vrm.update(deltaTime);
    renderer.render(scene, camera);
  }

  loop();
}
