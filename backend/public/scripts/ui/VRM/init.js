import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

import { configPromise } from "../../config.js";
import { show_error } from "../errors.js";
import { updateLipSync } from "./lipSync.js";
import { updateBlink } from "./blink.js";
import { updateAnimation } from "./animation.js";

// ------------------------ Overlay Detection ------------------------
function isOverlayEnabled() {
  const script = document.getElementById("main-script");
  return script?.dataset?.overlay === "true";
}

const overlay = isOverlayEnabled();

// ------------------------ Config ------------------------
const config = await configPromise;
const { defaultModelUrl, animationUrls, eyeTrackingEnabled } = config;

// ------------------------ Renderer ------------------------
const wrap = document.querySelector(".canvas-wrap");
const renderer = new THREE.WebGLRenderer({ alpha: overlay });
renderer.setClearColor(overlay ? 0x000000 : 0xffffff, overlay ? 0 : 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
wrap.appendChild(renderer.domElement);

// ------------------------ Camera & Controls ------------------------
function create_camera() {
  let camera;
  let controls;

  if (overlay) {
    camera = new THREE.PerspectiveCamera(
      13,
      window.innerWidth / window.innerHeight,
      0.1,
      20.0
    );
    camera.position.set(0.0, 1.2, 3.0);
  } else {
    camera = new THREE.PerspectiveCamera(
      12.2,
      window.innerWidth / window.innerHeight,
      0.1,
      20.0
    );
    camera.position.set(0.0, 2, 5.0);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();
  }

  return { camera, controls };
}

const { camera, controls } = create_camera();

// ------------------------ Scene ------------------------
function create_scene() {
  const scene = new THREE.Scene();

  let rawColor = config.light_color ?? 0xffffff;
  if (typeof rawColor === "string" && rawColor.startsWith("0x"))
    rawColor = parseInt(rawColor, 16);

  const lightColor = new THREE.Color(rawColor);
  const lightIntensity = config.light_intensety ?? 3;
  const light = new THREE.AmbientLight(lightColor, lightIntensity);
  light.position.set(1.0, 1.0, 1.0).normalize();
  scene.add(light);

  const lookAtTarget = new THREE.Object3D();
  camera.add(lookAtTarget);

  const clock = new THREE.Clock();
  return { scene, light, lookAtTarget, clock };
}

const { scene, light, lookAtTarget, clock } = create_scene();

// ------------------------ VRM Loader ------------------------
let currentVrm = null;
export async function loadVRM(modelUrl, scene, lookAtTarget) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.register(
      (parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true })
    );

    loader.load(
      modelUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm;

        if (currentVrm) {
          scene.remove(currentVrm.scene);
          VRMUtils.deepDispose(currentVrm.scene);
        }

        currentVrm = vrm;
        vrm.lookAt.target = lookAtTarget;
        scene.add(vrm.scene);

        resolve(vrm);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

// ------------------------ Animation Loop ------------------------
export function animate(clock, mixer, vrm) {
  const loader_container = document.getElementById("loader");
  const main_content_container = document.getElementById("main_content");

  setTimeout(() => {
    loader_container.classList.add("animate-out");
  }, 50);

  setTimeout(() => {
    main_content_container.classList.remove("hidden");
    main_content_container.classList.add("animate-in");
  }, 1500);

  function loop() {
    requestAnimationFrame(loop);
    const deltaTime = clock.getDelta();
    if (mixer) mixer.update(deltaTime);

    if (vrm) {
      updateAnimation(vrm, mixer);
      updateBlink(vrm, clock);
      updateLipSync(vrm);
      vrm.update(deltaTime);
    }

    renderer.render(scene, camera);
  }

  loop();
}

// ------------------------ Window Resize ------------------------
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ------------------------ Eye Tracking ------------------------
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

// ------------------------ Load Default VRM ------------------------
try {
  window.vrm = await loadVRM(defaultModelUrl, scene, lookAtTarget);
  const mixer = new THREE.AnimationMixer(vrm.scene);
  animate(clock, mixer, vrm);
} catch (error) {
  console.error("Failed to load VRM model:", error);
  show_error(
    "Failed to load VRM model. Please check the file path or network."
  );
}
