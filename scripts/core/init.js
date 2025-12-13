import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function init() {
  // renderer
  let renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xffffff, 1);
  document.body.appendChild(renderer.domElement);

  // camera
  let camera = new THREE.PerspectiveCamera(
    30.0,
    window.innerWidth / window.innerHeight,
    0.1,
    20.0
  );
  camera.position.set(0.0, 1.0, 5.0);

  // camera controls
  let controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.target.set(0.0, 1.0, 0.0);
  controls.update();

  // scene
  let scene = new THREE.Scene();

  // light
  let light = new THREE.DirectionalLight(0xffffff, Math.PI);
  light.position.set(1.0, 1.0, 1.0).normalize();
  scene.add(light);

  // lookat target
  let lookAtTarget = new THREE.Object3D();
  camera.add(lookAtTarget);

  const clock = new THREE.Clock();

  return { renderer, camera, controls, scene, light, lookAtTarget, clock };
}
