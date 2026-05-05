import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.03, 1.34, 1.22);
export const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0.02, 1.31, 0.2);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createScene() {
  return new THREE.Scene();
}

export function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    0.1,
    20,
  );

  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.lookAt(DEFAULT_CAMERA_TARGET);
  return camera;
}

export function createControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  controls.enableZoom = true;
  controls.zoomSpeed = 0.6;
  controls.minDistance = 1.1;
  controls.maxDistance = 1.4;

  controls.enablePan = true;
  controls.panSpeed = 1;

  controls.rotateSpeed = 0.5;

  controls.minPolarAngle = Math.PI * 0.4;
  controls.maxPolarAngle = Math.PI * 0.65;

  controls.minAzimuthAngle = -Math.PI * 0.2;
  controls.maxAzimuthAngle = Math.PI * 0.2;

  controls.target.set(
    DEFAULT_CAMERA_TARGET.x,
    DEFAULT_CAMERA_TARGET.y,
    DEFAULT_CAMERA_TARGET.z,
  );

  const PAN_LIMITS = {
    xMin: -0.4,
    xMax: 0.2,
    yMin: 0.9,
    yMax: 1.4,
    zMin: -0.3,
    zMax: 0.3,
  };

  controls.addEventListener("change", () => {
    controls.target.x = clamp(
      controls.target.x,
      PAN_LIMITS.xMin,
      PAN_LIMITS.xMax,
    );
    controls.target.y = clamp(
      controls.target.y,
      PAN_LIMITS.yMin,
      PAN_LIMITS.yMax,
    );
    controls.target.z = clamp(
      controls.target.z,
      PAN_LIMITS.zMin,
      PAN_LIMITS.zMax,
    );
  });

  controls.update();

  return controls;
}
