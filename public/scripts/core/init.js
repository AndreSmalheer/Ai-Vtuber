import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function init(overlay) {
  // renderer
  let renderer;

  if (overlay) {
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);
  } else {
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xffffff, 1);
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  const wrap = document.querySelector(".canvas-wrap");
  wrap.appendChild(renderer.domElement);

  wrap.addEventListener("pointerdown", (e) => {
    const rect = wrap.getBoundingClientRect();

    wrap.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    wrap.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });

  const canvas = renderer.domElement;

  let holdTimer;

  canvas.addEventListener("pointerdown", () => {
    holdTimer = setTimeout(() => {
      console.log("Held");
    }, 500);
  });

  // camera
  let camera;
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
  }

  // camera controls
  let controls;
  if (!overlay) {
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0);
    controls.update();
  }

  // scene
  let scene = new THREE.Scene();

  // light
  let light = new THREE.AmbientLight(0xffffff, 2);
  light.position.set(1.0, 1.0, 1.0).normalize();
  scene.add(light);

  // lookat target
  let lookAtTarget = new THREE.Object3D();
  camera.add(lookAtTarget);

  const clock = new THREE.Clock();

  return { renderer, camera, controls, scene, light, lookAtTarget, clock };
}
