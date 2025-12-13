// import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
// import { lipSyncActive, lipSyncData, analyser } from "../lipSync/lipSync.js";
import { updateBlink } from "./blink.js";
import { updateRandomIdle } from "./idleAnimation.js";
import { updateLipSync } from "../lipSync/lipSyncUpdate.js";

export function animate(
  clock,
  mixer,
  vrm,
  renderer,
  scene,
  camera,
  loadedActions
) {
  function loop() {
    requestAnimationFrame(loop);
    const deltaTime = clock.getDelta();
    if (mixer) mixer.update(deltaTime);

    updateBlink(vrm, clock);
    updateRandomIdle(vrm, loadedActions, clock);
    updateLipSync(vrm);

    if (vrm) vrm.update(deltaTime);
    renderer.render(scene, camera);
  }

  loop();
}
