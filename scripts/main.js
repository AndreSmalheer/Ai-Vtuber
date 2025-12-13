import * as THREE from "three";
// import { GLTFLoader } from "../three/addons/loaders/GLTFLoader.js";
// import { OrbitControls } from "../three/addons/controls/OrbitControls.js";
// import { loadMixamoAnimation } from "../three-vrm-3.4.4/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js";
// import GUI from "../three/addons/libs/lil-gui.module.min.js";

// Own modules
import { init } from "./core/init.js";
import { animate } from "./animation/animationLoop.js";
import { playAudioWithLipSync } from "./lipSync/lipSync.js";
import { loadVRM } from "./loaders/vrmLoader.js";
import { loadAnimations } from "./animation/animationLoader.js";
import { eyeTrackingEnabled } from "./config.js";

// Config
import { defaultModelUrl, animationUrls, audioUrl } from "./config.js";

const { renderer, camera, controls, scene, light, lookAtTarget, clock } =
  init();

const vrm = await loadVRM(defaultModelUrl, scene, lookAtTarget);

const currentMixer = new THREE.AnimationMixer(vrm.scene);

const { loadedActions } = await loadAnimations(
  animationUrls,
  vrm,
  currentMixer
);

// Start animation loop
animate(
  clock,
  currentMixer,
  vrm,
  renderer,
  scene,
  camera,
  loadedActions,
  lookAtTarget
);

document.addEventListener("click", () => {
  playAudioWithLipSync(audioUrl, vrm);
});

window.addEventListener("mousemove", (event) => {
  if (!eyeTrackingEnabled) return;
  lookAtTarget.position.x = 10 * (event.clientX / window.innerWidth - 0.5);
  lookAtTarget.position.y = 10 * (0.5 - event.clientY / window.innerHeight);
});

document.addEventListener("mouseout", () => {
  if (!eyeTrackingEnabled) return;
  lookAtTarget.position.x = 0;
  lookAtTarget.position.y = 0;
});
