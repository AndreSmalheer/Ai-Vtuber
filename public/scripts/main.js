import * as THREE from "three";
// import { GLTFLoader } from "../three/addons/loaders/GLTFLoader.js";
// import { OrbitControls } from "../three/addons/controls/OrbitControls.js";
// import { loadMixamoAnimation } from "../three-vrm-3.4.4/packages/three-vrm/examples/humanoidAnimation/loadMixamoAnimation.js";
// import GUI from "../three/addons/libs/lil-gui.module.min.js";

// Own modules
import { init } from "./core/init.js";
import { animate } from "./animation/animationLoop.js";
import { loadVRM } from "./loaders/vrmLoader.js";
import { loadAnimations } from "./animation/animationLoader.js";
import { show_error } from "./ui/errors.js";
// Try to get the script element
const script = document.getElementById("main-script");

let overlay = false;

if (script && script.dataset && script.dataset.overlay !== undefined) {
  overlay = script.dataset.overlay === "true";
}

// Config
import { configPromise } from "./config.js";
const config = await configPromise;
const defaultModelUrl = config.defaultModelUrl;
const animationUrls = config.animationUrls;
const eyeTrackingEnabled = config.eyeTrackingEnabled;

const { renderer, camera, controls, scene, light, lookAtTarget, clock } =
  init(overlay);

try {
  window.vrm = await loadVRM(defaultModelUrl, scene, lookAtTarget);
  // console.log("VRM model loaded successfully!");
} catch (error) {
  console.error("Failed to load VRM model:", error);
  show_error(
    "Failed to load VRM model. Please check the file path or network."
  );
}

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

import "./ui/input.js";

// import { streamOllamaResponse } from "./api/ollama.js";
// import { showTextChunk } from "./text-animations/textAnimator.js";

// const input = document.querySelector(".styled-input");
// const textSpan = document.getElementById("text_span");
// const chatSubmit = document.getElementById("chatSubmit");

// function handleUserInput(input) {
//   const userText = input.value;
//   input.value = "";

//   textSpan.innerHTML = userText;
//   textSpan.className = "";
//   textSpan.classList.remove("animate-text");
//   void textSpan.offsetWidth;
//   textSpan.classList.add("animate-text");

//   function onUserAnimationEnd() {
//     textSpan.removeEventListener("animationend", onUserAnimationEnd);

//     setTimeout(async () => {
//       textSpan.innerHTML = "";
//       textSpan.classList.remove("animate-text-ai");
//       void textSpan.offsetWidth;
//       textSpan.classList.add("animate-text-ai");

//       await streamOllamaResponse(textSpan, userText);
//     }, 1000);
//   }

//   textSpan.addEventListener("animationend", onUserAnimationEnd);
// }

// if (input) {
//   input.addEventListener("keydown", (event) => {
//     if (event.key === "Enter") handleUserInput(input);
//   });
// }

// chatSubmit.addEventListener("click", () => {
//   if (input.value) handleUserInput(input);
// });
