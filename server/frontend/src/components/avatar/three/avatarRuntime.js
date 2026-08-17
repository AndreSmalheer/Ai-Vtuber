import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";
import { VRMHumanBoneName } from "@pixiv/three-vrm";

/* =========================================================
   CONSTANTS & GLOBAL STATE
========================================================= */
const VRM_MODEL_DIR = "/3d-assests/vrm-models/";
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0.03, 1.34, 1.22);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0.02, 1.31, 0.2);
const CAMERA_IDLE_RETURN_DELAY = 0.1;
const CAMERA_RETURN_SPEED = 4.2;
const CAMERA_RETURN_EPSILON = 0.0001;

export const CharacterState = {
  UNLOADED: "unloaded",
  LOADING: "loading",
  IDLE: "idle",
  TALKING: "talking",
  LISTENING: "listening",
  THINKING: "thinking",
};

const motionStates = new WeakMap();

/* =========================================================
   MATH / UTILITY HELPERS
========================================================= */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function smoothValue(current, target, delta, attack = 20, release = 12) {
  const speed = target > current ? attack : release;
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
}

function setExpression(vrm, names, name, value) {
  if (names.has(name) && vrm.expressionManager) {
    vrm.expressionManager.setValue(name, clamp01(value));
  }
}

function applyBoneRotation(
  bone,
  baseQuaternion,
  x,
  y,
  z,
  tempEuler,
  tempQuaternion,
) {
  if (!bone || !baseQuaternion) return;
  tempEuler.set(x, y, z, "XYZ");
  tempQuaternion.setFromEuler(tempEuler);
  bone.quaternion.copy(baseQuaternion).multiply(tempQuaternion);
}

function getBone(vrm, name) {
  return (
    vrm.humanoid?.getNormalizedBoneNode?.(name) ||
    vrm.humanoid?.getRawBoneNode?.(name) ||
    null
  );
}

function getExpressionNames(vrm) {
  const expressions = vrm.expressionManager?.expressions || [];
  return new Set(expressions.map((expression) => expression.expressionName));
}

/* =========================================================
   VRM MOTION STATE
========================================================= */
function createMotionState(vrm) {
  const head = getBone(vrm, "head");
  const neck = getBone(vrm, "neck");
  const leftEye = getBone(vrm, "leftEye");
  const rightEye = getBone(vrm, "rightEye");
  const leftUpperArm = getBone(vrm, "leftUpperArm");
  const leftLowerArm = getBone(vrm, "leftLowerArm");
  const leftHand = getBone(vrm, "leftHand");
  const rightUpperArm = getBone(vrm, "rightUpperArm");
  const rightLowerArm = getBone(vrm, "rightLowerArm");
  const rightHand = getBone(vrm, "rightHand");
  const spine = getBone(vrm, "spine");
  const chest = getBone(vrm, "chest");
  const leftShoulder = getBone(vrm, "leftShoulder");
  const rightShoulder = getBone(vrm, "rightShoulder");

  return {
    head,
    neck,
    leftEye,
    rightEye,
    leftUpperArm,
    leftLowerArm,
    leftHand,
    rightUpperArm,
    rightLowerArm,
    rightHand,
    spine,
    chest,
    leftShoulder,
    rightShoulder,
    baseHead: head?.quaternion.clone(),
    baseNeck: neck?.quaternion.clone(),
    baseLeftEye: leftEye?.quaternion.clone(),
    baseRightEye: rightEye?.quaternion.clone(),
    baseLeftUpperArm: leftUpperArm?.quaternion.clone(),
    baseLeftLowerArm: leftLowerArm?.quaternion.clone(),
    baseLeftHand: leftHand?.quaternion.clone(),
    baseRightUpperArm: rightUpperArm?.quaternion.clone(),
    baseRightLowerArm: rightLowerArm?.quaternion.clone(),
    baseRightHand: rightHand?.quaternion.clone(),
    baseSpine: spine?.quaternion.clone(),
    baseChest: chest?.quaternion.clone(),
    baseLeftShoulder: leftShoulder?.quaternion.clone(),
    baseRightShoulder: rightShoulder?.quaternion.clone(),
    gaze: new THREE.Vector2(0, 0),
    targetGaze: new THREE.Vector2(0, 0),
    nextGazeShift: 0,
    nextSmile: 0,
    smileUntil: 0,
    headMotion: new THREE.Vector3(),
    bodyMotion: new THREE.Vector3(),
    armMotion: new THREE.Vector3(),
    handMotion: new THREE.Vector3(),
    shoulderMotion: 0,
    headDrift: new THREE.Vector3(),
    targetHeadDrift: new THREE.Vector3(),
    nextDriftShift: 0,
    speechNod: 0,
    speechTilt: 0,
    energySmooth: 0,
  };
}

function getMotionState(vrm) {
  let state = motionStates.get(vrm);
  if (!state) {
    state = createMotionState(vrm);
    motionStates.set(vrm, state);
  }
  return state;
}

/* =========================================================
   THREE.JS SETUP
========================================================= */
function canCreateWebGLContext() {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");
  const supported = Boolean(context);

  context?.getExtension?.("WEBGL_lose_context")?.loseContext();
  return supported;
}

function createRenderer(container) {
  if (!canCreateWebGLContext()) {
    throw new Error("WebGL is not available in this browser context.");
  }

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

function createScene() {
  return new THREE.Scene();
}

function createCamera(container) {
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

function createControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = true;
  controls.zoomSpeed = 0.6;
  controls.enablePan = true;
  controls.panSpeed = 1;
  controls.rotateSpeed = 0.5;
  controls.target.copy(DEFAULT_CAMERA_TARGET);

  controls.updateLimits = (useLimits) => {
    if (useLimits) {
      controls.minDistance = 1.1;
      controls.maxDistance = 1.4;

      controls.minPolarAngle = Math.PI * 0.4;
      controls.maxPolarAngle = Math.PI * 0.65;

      controls.minAzimuthAngle = -Math.PI * 0.2;
      controls.maxAzimuthAngle = Math.PI * 0.2;
    } else {
      controls.minDistance = 0;
      controls.maxDistance = Infinity;

      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;

      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
    }
  };

  controls.updateLimits(true);

  return controls;
}

/* =========================================================
   VISUALS / LIGHTING / THEME
========================================================= */
function updateThemeVisuals(renderer, scene, isDark, enableEffects) {
  const bgColor = isDark ? 0x0b0b0f : 0xe8e6e2;

  renderer.setClearColor(bgColor, 1);
  scene.fog = enableEffects
    ? new THREE.FogExp2(bgColor, isDark ? 0.03 : 0.025)
    : null;

  scene.children
    .filter((child) => child instanceof THREE.Light)
    .forEach((light) => scene.remove(light));

  const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.24 : 0.4);

  const keyLight = new THREE.DirectionalLight(
    isDark ? 0xffddc8 : 0xffead6,
    isDark ? 0.38 : 0.5,
  );
  keyLight.position.set(0.9, 2.0, 1.7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;

  const fillLight = new THREE.DirectionalLight(
    isDark ? 0xa8c4ff : 0xb9d4ff,
    isDark ? 0.08 : 0.12,
  );
  fillLight.position.set(-1.1, 1.1, 1.4);

  const rimLight = new THREE.DirectionalLight(0xffffff, isDark ? 0.08 : 0.12);
  rimLight.position.set(-0.6, 1.8, -2.2);

  const faceLight = new THREE.SpotLight(
    isDark ? 0xffceb0 : 0xfff1e6,
    isDark ? 1.35 : 1.0,
    7,
    Math.PI / 7,
    0.7,
    1.5,
  );
  faceLight.position.set(0, 1.7, 1.15);
  faceLight.target.position.set(0, 1.45, 0);

  scene.add(
    ambientLight,
    keyLight,
    fillLight,
    rimLight,
    faceLight,
    faceLight.target,
  );

  return { keyLight, fillLight, faceLight };
}

function updateLights(lights, time) {
  if (lights?.keyLight) {
    lights.keyLight.intensity = 0.5 + Math.sin(time * 0.6) * 0.03;
  }

  if (lights?.faceLight) {
    lights.faceLight.intensity = 0.75 + Math.sin(time * 0.8) * 0.02;
    lights.faceLight.position.x = Math.sin(time * 0.3) * 0.05;
    lights.faceLight.position.y = 1.8 + Math.sin(time * 0.4) * 0.02;
  }
}

/* =========================================================
   RESIZE HANDLING
========================================================= */
function handleResize(container, camera, renderer, composer) {
  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    composer.setSize(width, height);
  };

  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}

/* =========================================================
   VRM LOADING / DISPOSAL
========================================================= */
function getModelUrl(modelName) {
  if (!modelName || typeof modelName !== "string") {
    throw new Error("No VRM model selected.");
  }

  const filename = modelName.split(/[\\/]/).pop();
  if (!filename?.toLowerCase().endsWith(".vrm")) {
    throw new Error(`Invalid VRM model filename: ${modelName}`);
  }

  return `${VRM_MODEL_DIR}${encodeURIComponent(filename)}`;
}

async function loadVRM(scene, modelName, signal) {
  const url = getModelUrl(modelName);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Could not load ${modelName}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error(
      `Could not load ${modelName}: server returned HTML instead of a VRM file.`,
    );
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 4) {
    throw new Error(`Could not load ${modelName}: file is empty or invalid.`);
  }

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buffer, VRM_MODEL_DIR, resolve, reject);
  });

  const vrm = gltf.userData.vrm;
  if (!vrm?.scene) {
    throw new Error(`${modelName} loaded, but no VRM data was found.`);
  }

  scene.add(vrm.scene);
  return vrm;
}

function disposeVRM(scene, vrm) {
  if (!vrm) return;

  if (vrm.scene) {
    scene?.remove(vrm.scene);
    vrm.scene.traverse((object) => {
      object.geometry?.dispose?.();

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.filter(Boolean).forEach((material) => material.dispose?.());
    });
  }

  vrm.dispose?.();
}

function ensureVisible(vrm) {
  if (!vrm?.scene) return;

  vrm.scene.visible = true;
  vrm.scene.traverse((object) => {
    object.visible = true;
  });
}

/* =========================================================
   AUDIO / LIP SYNC
========================================================= */
function createAudioReader() {
  return (lipSyncState, time) => {
    if (!lipSyncState?.isPlaying) {
      return { volume: 0, low: 0, mid: 0, high: 0, fallback: false };
    }

    const { analyser, frequencyData, timeDomainData } = lipSyncState;

    if (analyser && frequencyData && timeDomainData) {
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeDomainData);

      let rms = 0;
      for (let i = 0; i < timeDomainData.length; i += 1) {
        const sample = (timeDomainData[i] - 128) / 128;
        rms += sample * sample;
      }
      rms = Math.sqrt(rms / timeDomainData.length);

      const bandAverage = (start, end) => {
        let sum = 0;
        const safeEnd = Math.min(end, frequencyData.length);
        for (let i = start; i < safeEnd; i += 1) sum += frequencyData[i];
        return safeEnd > start ? sum / (safeEnd - start) / 255 : 0;
      };

      return {
        volume: clamp01((rms - 0.012) * 9),
        low: bandAverage(1, 8),
        mid: bandAverage(8, 32),
        high: bandAverage(32, 96),
        fallback: false,
      };
    }

    const pulse =
      0.55 + Math.sin(time * 15) * 0.28 + Math.sin(time * 27) * 0.12;

    return {
      volume: clamp01(pulse),
      low: 0.45 + Math.sin(time * 7) * 0.18,
      mid: 0.55 + Math.sin(time * 11) * 0.2,
      high: 0.35 + Math.sin(time * 13) * 0.15,
      fallback: true,
    };
  };
}

function updateLipSync(
  vrm,
  expressionNames,
  lipSyncState,
  delta,
  time,
  mouthState,
  readAudioShape,
) {
  const audio = readAudioShape(lipSyncState, time);

  const targetOpen = audio.volume < 0.04 ? 0 : clamp01(audio.volume * 0.58);
  mouthState.openness = smoothValue(mouthState.openness, targetOpen, delta);

  const rounded = clamp01(
    (audio.low * 1.2 - audio.high * 0.25) * mouthState.openness,
  );
  const wide = clamp01(
    (audio.high * 1.1 + audio.mid * 0.45) * mouthState.openness,
  );
  const open = clamp01(mouthState.openness * 1.15 - rounded * 0.2);

  const targets = {
    aa: open * 0.52,
    ih: wide * 0.3,
    ou: rounded * 0.24,
    ee: wide * 0.22,
    oh: rounded * 0.38 + open * 0.08,
  };

  mouthState.aa = smoothValue(mouthState.aa, targets.aa, delta, 22, 16);
  mouthState.ih = smoothValue(mouthState.ih, targets.ih, delta, 18, 14);
  mouthState.ou = smoothValue(mouthState.ou, targets.ou, delta, 18, 14);
  mouthState.ee = smoothValue(mouthState.ee, targets.ee, delta, 18, 14);
  mouthState.oh = smoothValue(mouthState.oh, targets.oh, delta, 18, 14);

  setExpression(vrm, expressionNames, "aa", mouthState.aa);
  setExpression(vrm, expressionNames, "ih", mouthState.ih);
  setExpression(vrm, expressionNames, "ou", mouthState.ou);
  setExpression(vrm, expressionNames, "ee", mouthState.ee);
  setExpression(vrm, expressionNames, "oh", mouthState.oh);

  return audio;
}

/* =========================================================
   FACE / BODY ANIMATION SYSTEM
========================================================= */
class AvatarExpressions {
  constructor(avatarMood) {
    this.mood = avatarMood;
  }

  blink({ vrm, expressionNames, delta, blinkState }) {
    blinkState.timer += delta;

    if (
      !blinkState.isBlinking &&
      blinkState.timer >= blinkState.nextBlinkTime
    ) {
      blinkState.isBlinking = true;
      blinkState.timer = 0;
    }

    if (!blinkState.isBlinking) return;

    const blinkProgress = Math.min(blinkState.timer / blinkState.duration, 1);

    const blinkValue =
      blinkProgress <= 0.5 ? blinkProgress * 2 : 1 - (blinkProgress - 0.5) * 2;

    setExpression(vrm, expressionNames, "blink", blinkValue);

    setExpression(vrm, expressionNames, "blinkLeft", blinkValue);

    setExpression(vrm, expressionNames, "blinkRight", blinkValue);

    if (blinkState.timer >= blinkState.duration) {
      blinkState.isBlinking = false;

      blinkState.timer = 0;

      blinkState.nextBlinkTime = 2 + Math.random() * 6;

      setExpression(vrm, expressionNames, "blink", 0);

      setExpression(vrm, expressionNames, "blinkLeft", 0);

      setExpression(vrm, expressionNames, "blinkRight", 0);
    }
  }

  smile({
    vrm,
    expressionNames,
    expressionState,
    smileState,
    lookAwayState,
    delta,
    characterState,
    expressionOverrideActive,
  }) {
    if (
      characterState === CharacterState.TALKING ||
      characterState === CharacterState.LISTENING
    ) {
      return;
    }

    if (expressionOverrideActive) {
      return;
    }

    smileState.timer += delta;

    if (!smileState.isSmiling && smileState.timer >= smileState.nextSmileTime) {
      smileState.isSmiling = true;
      smileState.timer = 0;

      lookAwayState.targetEye.set(0, 0);
      lookAwayState.targetHead.set(0, 0, 0);
    }

    if (!smileState.isSmiling) return;

    const fadeTime = 0.35;
    const holdTime = smileState.holdTime;
    const totalTime = fadeTime + holdTime + fadeTime;

    let smileAmount = 0;

    if (smileState.timer < fadeTime) {
      smileAmount = smileState.timer / fadeTime;
    } else if (smileState.timer < fadeTime + holdTime) {
      smileAmount = 1;
    } else {
      smileAmount = 1 - (smileState.timer - fadeTime - holdTime) / fadeTime;
    }

    expressionState.happy = Math.max(0, smileAmount) * 0.28;

    setExpression(vrm, expressionNames, "happy", expressionState.happy);

    if (smileState.timer >= totalTime) {
      smileState.isSmiling = false;
      smileState.timer = 0;
      smileState.nextSmileTime = 8 + Math.random() * 12;

      expressionState.happy = 0;

      setExpression(vrm, expressionNames, "happy", 0);
    }
  }

  reset() {}

  animate({
    vrm,
    expressionNames,
    characterState,
    lipSyncState,
    delta,
    time,
    mouthState,
    readAudioShape,
    expressionState,
    tempEuler,
    tempQuaternion,
    blinkState,
    smileState,
    lookAwayState,
    expressionOverrideActive,
  }) {
    this.blink({ vrm, expressionNames, delta, blinkState });
    this.smile({
      vrm,
      expressionNames,
      expressionState,
      smileState,
      lookAwayState,
      delta,
      smileState,
      lookAwayState,
      characterState,
      expressionOverrideActive,
    });
  }
}

export class AvatarMoodAnimator {
  constructor() {
    this.active = false;
    this.mood = null;
    this.elapsed = 0;
    this.duration = 0.8;
  }

  start(mood) {
    this.active = true;
    this.mood = mood;
    this.elapsed = 0;
  }

  update({ vrm, delta }) {
    if (!this.active) return false;
    this.elapsed += delta;
    switch (this.mood) {
      case "happy":
        return this.happy({ vrm, delta });
      case "sad":
        return this.sad({ vrm, delta });
      case "angry":
        return this.angry({ vrm, delta });
      case "surprised":
        return this.surprised({ vrm, delta });
      default:
        console.log("[MoodAnimator] Unknown mood:", this.mood);
        return this.finish();
    }
  }

  finish() {
    this.active = false;
    this.mood = null;
    this.elapsed = 0;
    this._startRotations = {};
    return true;
  }

  //   helpers

  getHead(vrm) {
    return vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head);
  }

  captureHeadRotation(head, key) {
    if (!this._startRotations) this._startRotations = {};
    if (!this._startRotations[key]) {
      this._startRotations[key] = {
        x: head.rotation.x,
        y: head.rotation.y,
        z: head.rotation.z,
      };
    }
    return this._startRotations[key];
  }

  resetHeadRotation(head, key) {
    const start = this._startRotations?.[key];
    if (!start) return;
    head.rotation.x = start.x;
    head.rotation.y = start.y;
    head.rotation.z = start.z;
    delete this._startRotations[key];
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  interpolateKeyframes(time, keyframes) {
    for (let i = 0; i < keyframes.length - 1; i++) {
      const a = keyframes[i];
      const b = keyframes[i + 1];
      if (time >= a.t && time <= b.t) {
        const localT = b.t - a.t > 0 ? (time - a.t) / (b.t - a.t) : 1;
        const eased = this.easeInOutCubic(localT);
        return THREE.MathUtils.lerp(a.value, b.value, eased);
      }
    }
    return keyframes[keyframes.length - 1].value;
  }

  resolveExpressionName(vrm, candidates) {
    if (!vrm.expressionManager) return null;
    for (const name of candidates) {
      try {
        if (vrm.expressionManager.getExpression?.(name)) return name;
        if (
          typeof vrm.expressionManager.getValue === "function" &&
          vrm.expressionManager.getValue(name) !== undefined
        ) {
          return name;
        }
      } catch {}
    }
    return null;
  }

  setExpression(vrm, candidates, value) {
    if (!vrm.expressionManager) return null;
    const name = this.resolveExpressionName(vrm, candidates);
    if (name) vrm.expressionManager.setValue(name, value);
    return name;
  }

  resetExpression(vrm, candidates) {
    if (!vrm.expressionManager) return;
    const name = this.resolveExpressionName(vrm, candidates);
    if (name) vrm.expressionManager.setValue(name, 0);
  }

  //   Animations

  happy({ vrm: t }) {
    const e = this.getHead(t);
    if (!e) return this.finish();

    const s = Math.min(this.elapsed / 5.5, 1);
    const a = this.captureHeadRotation(e, "happy");
    const r = THREE.MathUtils.degToRad(10);
    const i = THREE.MathUtils.degToRad(1.6);
    const n = THREE.MathUtils.degToRad(7);
    const o = Math.min(this.elapsed, 5.5);

    const h = this.interpolateKeyframes(o, [
      { t: 0, value: 0 },
      { t: 0.8, value: 1 },
      { t: 1.8, value: 0.85 },
      { t: 2.8, value: -0.25 },
      { t: 4, value: 0.3 },
      { t: 5.5, value: 0 },
    ]);
    const u = this.interpolateKeyframes(o, [
      { t: 0, value: 0 },
      { t: 1.2, value: 1 },
      { t: 4.2, value: 0.85 },
      { t: 5.5, value: 0 },
    ]);
    const l = this.interpolateKeyframes(o, [
      { t: 0, value: 0 },
      { t: 0.7, value: 1 },
      { t: 4.6, value: 0.95 },
      { t: 5.5, value: 0 },
    ]);

    const p = h * r;
    const d = Math.abs(h) * i * Math.sin(1.1 * o);
    const v = u * n;

    e.rotation.y = a.y + p;
    e.rotation.x = a.x + d;
    e.rotation.z = a.z + v;

    this.setExpression(t, ["happy", "joy"], 0.2 * l);
    this.setExpression(t, ["eyeWide", "wide"], 0.85 * l);
    t.expressionManager?.update?.();

    if (s >= 1) {
      this.resetHeadRotation(e, "happy");
      this.resetExpression(t, ["happy", "joy"]);
      this.resetExpression(t, ["eyeWide", "wide"]);
      t.expressionManager?.update?.();
      return this.finish();
    }
    return false;
  }

  sad({ vrm, delta }) {
    return false;
  }
  angry({ vrm, delta }) {
    return false;
  }
  surprised({ vrm, delta }) {
    return false;
  }
}

export class AvatarAnimator {
  constructor(avatarMood) {
    this.smileState = {
      timer: 0,
      nextSmileTime: 5 + Math.random() * 10,
      isSmiling: false,
      holdTime: 1.5,
    };

    this.lookAwayState = {
      phase: "neutral",
      nextLookAway: 10 + Math.random() * 15,
      lookAwayUntil: 0,
      targetEye: new THREE.Vector2(),
      targetHead: new THREE.Vector3(),
      currentEye: new THREE.Vector2(),
      currentHead: new THREE.Vector3(),
    };

    this.AvatarExpressions = new AvatarExpressions(avatarMood);

    this.expressionOverrideActive = false;
    this.moodAnimator = new AvatarMoodAnimator();
  }

  setExpressionOverrideActive(active) {
    this.expressionOverrideActive = active;
  }

  startMoodAnimation(mood) {
    this.setExpressionOverrideActive(true);

    this.moodAnimator.start(mood);
  }

  animate({
    vrm,
    expressionNames,
    characterState,
    lipSyncState,
    delta,
    time,
    mouthState,
    readAudioShape,
    expressionState,
    tempEuler,
    tempQuaternion,
    blinkState,
  }) {
    switch (characterState) {
      case CharacterState.IDLE:
        this.idle({
          vrm,
          expressionNames,
          delta,
          time,
          expressionState,
          mouthState,
          tempEuler,
          tempQuaternion,
          smileState: this.smileState,
        });
        break;

      case CharacterState.TALKING:
        this.talking({
          vrm,
          expressionNames,
          lipSyncState,
          delta,
          time,
          mouthState,
          readAudioShape,
          expressionState,
          tempEuler,
          tempQuaternion,
        });
        break;

      case CharacterState.LISTENING:
        this.listening({
          vrm,
          expressionNames,
          delta,
          time,
          mouthState,
          expressionState,
          tempEuler,
          tempQuaternion,
          smileState: this.smileState,
        });
        break;

      case CharacterState.THINKING:
        this.thinking();
        break;

      default:
        break;
    }

    const moodFinished = this.moodAnimator.update({
      vrm,
      delta,
    });

    if (moodFinished) {
      this.setExpressionOverrideActive(false);

      console.log(
        "[AvatarAnimator] Mood animation finished - expression override disabled",
      );
    }

    this.AvatarExpressions.animate({
      vrm,
      expressionNames,
      characterState,
      lipSyncState,
      delta,
      time,
      mouthState,
      readAudioShape,
      expressionState,
      tempEuler,
      tempQuaternion,
      blinkState,
      smileState: this.smileState,
      lookAwayState: this.lookAwayState,
      expressionOverrideActive: this.expressionOverrideActive,
    });
  }

  idle({
    vrm,
    expressionNames,
    delta,
    time,
    mouthState,
    expressionState,
    tempEuler,
    tempQuaternion,
    smileState,
  }) {
    const state = getMotionState(vrm);
    const la = this.lookAwayState;

    mouthState.openness = smoothValue(mouthState.openness, 0, delta, 10, 10);
    mouthState.aa = smoothValue(mouthState.aa, 0, delta, 10, 10);
    mouthState.ih = smoothValue(mouthState.ih, 0, delta, 10, 10);
    mouthState.ou = smoothValue(mouthState.ou, 0, delta, 10, 10);
    mouthState.ee = smoothValue(mouthState.ee, 0, delta, 10, 10);
    mouthState.oh = smoothValue(mouthState.oh, 0, delta, 10, 10);

    setExpression(vrm, expressionNames, "aa", mouthState.aa);
    setExpression(vrm, expressionNames, "ih", mouthState.ih);
    setExpression(vrm, expressionNames, "ou", mouthState.ou);
    setExpression(vrm, expressionNames, "ee", mouthState.ee);
    setExpression(vrm, expressionNames, "oh", mouthState.oh);

    // --------------------
    // Look-around head movement
    // --------------------

    if (
      time >= la.nextLookAway &&
      !smileState.isSmiling &&
      expressionState.happy < 0.05
    ) {
      const currentX = la.currentEye.x;

      const side =
        currentX < 0 ? 1 : currentX > 0.05 ? -1 : Math.random() < 0.5 ? -1 : 1;

      const isWide = Math.random() < 0.25;

      la.targetEye.set(
        side *
          (isWide ? 0.09 + Math.random() * 0.07 : 0.03 + Math.random() * 0.05),
        THREE.MathUtils.randFloatSpread(isWide ? 0.05 : 0.03),
      );

      la.targetHead.set(
        la.targetEye.x * 0.18,
        la.targetEye.y * 0.12,
        la.targetEye.x * -0.02,
      );

      la.nextLookAway =
        time + (isWide ? 8 + Math.random() * 8 : 5 + Math.random() * 8);
    }

    const isReturning =
      Math.abs(la.targetEye.x) < 0.001 && Math.abs(la.targetHead.x) < 0.001;

    const driftSpeed = isReturning ? 5.0 : 1.8 + Math.random() * 0.4;

    la.currentEye.lerp(la.targetEye, 1 - Math.exp(-driftSpeed * delta));

    la.currentHead.lerp(la.targetHead, 1 - Math.exp(-driftSpeed * delta));

    // --------------------
    // Idle gaze movement
    // --------------------

    if (time >= state.nextGazeShift) {
      const isGlance = Math.random() < 0.16;
      state.targetGaze.set(
        isGlance
          ? THREE.MathUtils.randFloatSpread(0.18)
          : THREE.MathUtils.randFloatSpread(0.045),
        isGlance
          ? THREE.MathUtils.randFloatSpread(0.08)
          : THREE.MathUtils.randFloat(0.0, 0.045),
      );
      state.nextGazeShift =
        time +
        (isGlance ? 0.35 + Math.random() * 0.45 : 1.2 + Math.random() * 2.2);
    }

    state.gaze.lerp(state.targetGaze, 1 - Math.exp(-4 * delta));

    // --------------------
    // Idle head drift
    // --------------------

    if (time >= state.nextDriftShift) {
      state.targetHeadDrift.set(
        THREE.MathUtils.randFloatSpread(0.022),
        THREE.MathUtils.randFloatSpread(0.016),
        THREE.MathUtils.randFloatSpread(0.01),
      );
      state.nextDriftShift = time + 1.8 + Math.random() * 3.2;
    }

    state.headDrift.lerp(state.targetHeadDrift, 1 - Math.exp(-1.4 * delta));

    // --------------------
    // Idle body movement
    // --------------------

    const swayX = Math.sin(time * 1.17) * 0.008 + Math.sin(time * 2.83) * 0.004;
    const swayY = Math.sin(time * 0.73) * 0.007 + Math.sin(time * 1.91) * 0.004;
    const swayZ = Math.sin(time * 0.97) * 0.006 + Math.sin(time * 1.57) * 0.003;

    const targetHead = new THREE.Vector3(
      state.headDrift.x + swayX + la.currentHead.x,
      state.headDrift.y + swayY + state.gaze.x * 0.06 + la.currentHead.y,
      state.headDrift.z + swayZ + state.gaze.x * -0.035 + la.currentHead.z,
    );

    state.headMotion.lerp(targetHead, 1 - Math.exp(-5 * delta));
    state.bodyMotion.lerp(state.headMotion, 1 - Math.exp(-2.5 * delta));
    state.armMotion.lerp(state.bodyMotion, 1 - Math.exp(-1.8 * delta));

    // --------------------
    // Breathing
    // --------------------

    const breathing = Math.sin(time * 1.2) * 0.012 * 0.55;

    // --------------------
    // Arms
    // --------------------

    const armBreathing = Math.sin(time * 1.2) * 0.012 * 0.55;
    const swayAmp = 0.0035;
    const armSwayL =
      Math.sin(time * 0.5) * swayAmp + Math.sin(time * 0.9) * swayAmp * 0.25;
    const armSwayR =
      Math.sin(time * 0.52 + 0.6) * swayAmp +
      Math.sin(time * 0.88 + 0.3) * swayAmp * 0.25;

    const upperArmX = state.armMotion.x * 0.1 + armBreathing * 0.25 + armSwayL;
    const upperArmY = state.armMotion.y * 0.08;
    const upperArmZ = state.armMotion.z * 0.12;

    applyBoneRotation(
      state.leftUpperArm,
      state.baseLeftUpperArm,
      upperArmX,
      upperArmY + 0.1,
      upperArmZ - 1.35,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.rightUpperArm,
      state.baseRightUpperArm,
      upperArmX - armSwayL + armSwayR,
      upperArmY - 0.1,
      upperArmZ + 1.35,
      tempEuler,
      tempQuaternion,
    );

    // --------------------
    // Body bones
    // --------------------

    applyBoneRotation(
      state.spine,
      state.baseSpine,
      state.bodyMotion.x * 0.18 + breathing * 0.3,
      state.bodyMotion.y * 0.15,
      state.bodyMotion.z * 0.12,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.chest,
      state.baseChest,
      state.bodyMotion.x * 0.25 + breathing,
      state.bodyMotion.y * 0.22,
      state.bodyMotion.z * 0.18,
      tempEuler,
      tempQuaternion,
    );

    if (!this.expressionOverrideActive) {
      applyBoneRotation(
        state.neck,
        state.baseNeck,
        state.headMotion.x * 0.35,
        state.headMotion.y * 0.35,
        state.headMotion.z * 0.3,
        tempEuler,
        tempQuaternion,
      );

      applyBoneRotation(
        state.head,
        state.baseHead,
        state.headMotion.x,
        state.headMotion.y,
        state.headMotion.z,
        tempEuler,
        tempQuaternion,
      );

      // --------------------
      // Eyes
      // --------------------

      const eyeX =
        (state.gaze.y + la.currentEye.y) * 0.3 + Math.sin(time * 2.7) * 0.006;
      const eyeY =
        (state.gaze.x + la.currentEye.x) * 0.42 + Math.sin(time * 1.8) * 0.008;

      applyBoneRotation(
        state.leftEye,
        state.baseLeftEye,
        eyeX,
        eyeY,
        0,
        tempEuler,
        tempQuaternion,
      );

      applyBoneRotation(
        state.rightEye,
        state.baseRightEye,
        eyeX,
        eyeY,
        0,
        tempEuler,
        tempQuaternion,
      );

      // --------------------
      // Expressions
      // --------------------

      expressionState.happy = smoothValue(
        expressionState.happy,
        time < state.smileUntil ? 0.28 : 0.05,
        delta,
        4,
        2.5,
      );

      expressionState.relaxed = smoothValue(
        expressionState.relaxed,
        0.12,
        delta,
        4,
        3,
      );

      setExpression(vrm, expressionNames, "happy", expressionState.happy);
      setExpression(vrm, expressionNames, "relaxed", expressionState.relaxed);
    }
  }

  talking({
    vrm,
    expressionNames,
    lipSyncState,
    delta,
    time,
    mouthState,
    readAudioShape,
    expressionState,
    tempEuler,
    tempQuaternion,
  }) {
    const audio = updateLipSync(
      vrm,
      expressionNames,
      lipSyncState,
      delta,
      time,
      mouthState,
      readAudioShape,
    );

    const state = getMotionState(vrm);
    const speechEnergy = audio.volume;

    if (time >= state.nextGazeShift) {
      const isGlance = Math.random() < 0.06;

      state.targetGaze.set(
        isGlance
          ? THREE.MathUtils.randFloatSpread(0.04)
          : THREE.MathUtils.randFloatSpread(0.015),

        isGlance
          ? THREE.MathUtils.randFloatSpread(0.02)
          : THREE.MathUtils.randFloat(-0.008, 0.016),
      );

      state.nextGazeShift =
        time +
        (isGlance ? 0.35 + Math.random() * 0.5 : 1.0 + Math.random() * 1.4);
    }

    state.gaze.lerp(state.targetGaze, 1 - Math.exp(-10 * delta));

    if (time >= state.nextDriftShift) {
      state.targetHeadDrift.set(
        THREE.MathUtils.randFloatSpread(0.01),
        THREE.MathUtils.randFloatSpread(0.008),
        THREE.MathUtils.randFloatSpread(0.006),
      );

      state.nextDriftShift = time + 1.9 + Math.random() * 2.3;
    }

    state.headDrift.lerp(state.targetHeadDrift, 1 - Math.exp(-2.0 * delta));

    state.energySmooth = THREE.MathUtils.lerp(
      state.energySmooth,
      speechEnergy,
      1 - Math.exp(-8 * delta),
    );

    const nodTarget = state.energySmooth * 0.028 + speechEnergy * 0.01;

    state.speechNod = THREE.MathUtils.lerp(
      state.speechNod,
      nodTarget,
      1 - Math.exp(-6.5 * delta),
    );

    const tiltTarget =
      Math.sin(time * 1.15) * 0.01 * state.energySmooth +
      state.energySmooth * 0.006;

    state.speechTilt = THREE.MathUtils.lerp(
      state.speechTilt,
      tiltTarget,
      1 - Math.exp(-4.5 * delta),
    );

    const swayX = Math.sin(time * 1.17) * 0.008 + Math.sin(time * 2.83) * 0.004;

    const swayY = Math.sin(time * 0.73) * 0.007 + Math.sin(time * 1.91) * 0.004;

    const swayZ = Math.sin(time * 0.97) * 0.006 + Math.sin(time * 1.57) * 0.003;

    const speechFlow = new THREE.Vector3(
      Math.sin(time * 2.1) * 0.006 * (0.4 + state.energySmooth),
      Math.sin(time * 1.7 + 0.8) * 0.004 * (0.35 + state.energySmooth),
      Math.sin(time * 2.6 + 1.4) * 0.003 * (0.35 + state.energySmooth),
    );

    const targetHead = new THREE.Vector3(
      state.headDrift.x + swayX + state.speechNod + speechFlow.x,
      state.headDrift.y + swayY + state.gaze.x * 0.06 + speechFlow.y,
      state.headDrift.z +
        swayZ +
        state.gaze.x * -0.035 +
        state.speechTilt +
        speechFlow.z,
    );

    state.headMotion.lerp(targetHead, 1 - Math.exp(-9 * delta));

    state.bodyMotion.lerp(state.headMotion, 1 - Math.exp(-4 * delta));

    state.armMotion.lerp(state.bodyMotion, 1 - Math.exp(-2.8 * delta));

    state.handMotion.lerp(state.armMotion, 1 - Math.exp(-(2.8 * 0.8) * delta));

    const breathing = Math.sin(time * 1.5) * 0.012 * 0.65;

    state.shoulderMotion = THREE.MathUtils.lerp(
      state.shoulderMotion,
      speechEnergy * 0.025,
      1 - Math.exp(-6 * delta),
    );

    const shoulderX = state.shoulderMotion + state.bodyMotion.x * 0.08;

    const shoulderZ = state.bodyMotion.z * 0.15;

    applyBoneRotation(
      state.spine,
      state.baseSpine,
      state.bodyMotion.x * 0.18 + breathing * 0.3,
      state.bodyMotion.y * 0.15,
      state.bodyMotion.z * 0.12,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.chest,
      state.baseChest,
      state.bodyMotion.x * 0.25 + breathing,
      state.bodyMotion.y * 0.22,
      state.bodyMotion.z * 0.18,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.leftShoulder,
      state.baseLeftShoulder,
      shoulderX,
      0,
      shoulderZ,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.rightShoulder,
      state.baseRightShoulder,
      shoulderX,
      0,
      shoulderZ,
      tempEuler,
      tempQuaternion,
    );

    if (!this.expressionOverrideActive) {
      applyBoneRotation(
        state.neck,
        state.baseNeck,
        state.headMotion.x * 0.35,
        state.headMotion.y * 0.35,
        state.headMotion.z * 0.3,
        tempEuler,
        tempQuaternion,
      );

      applyBoneRotation(
        state.head,
        state.baseHead,
        state.headMotion.x,
        state.headMotion.y,
        state.headMotion.z,
        tempEuler,
        tempQuaternion,
      );
    }

    const armBreathing = Math.sin(time * 1.2) * 0.012 * 0.55;

    const swayAmp = 0.0035;

    const armSwayL =
      Math.sin(time * 0.5) * swayAmp + Math.sin(time * 0.9) * swayAmp * 0.25;

    const armSwayR =
      Math.sin(time * 0.52 + 0.6) * swayAmp +
      Math.sin(time * 0.88 + 0.3) * swayAmp * 0.25;

    const upperArmX = state.armMotion.x * 0.1 + armBreathing * 0.25 + armSwayL;

    const upperArmY = state.armMotion.y * 0.08;

    const upperArmZ = state.armMotion.z * 0.12;

    applyBoneRotation(
      state.leftUpperArm,
      state.baseLeftUpperArm,
      upperArmX,
      upperArmY + 0.1,
      upperArmZ - 1.35,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.rightUpperArm,
      state.baseRightUpperArm,
      upperArmX - armSwayL + armSwayR,
      upperArmY - 0.1,
      upperArmZ + 1.35,
      tempEuler,
      tempQuaternion,
    );

    if (!this.expressionOverrideActive) {
      const eyeX = state.gaze.y * 0.3 + Math.sin(time * 2.7) * 0.006;

      const eyeY = state.gaze.x * 0.42 + Math.sin(time * 1.8) * 0.008;

      applyBoneRotation(
        state.leftEye,
        state.baseLeftEye,
        eyeX,
        eyeY,
        0,
        tempEuler,
        tempQuaternion,
      );

      applyBoneRotation(
        state.rightEye,
        state.baseRightEye,
        eyeX,
        eyeY,
        0,
        tempEuler,
        tempQuaternion,
      );

      setExpression(
        vrm,
        expressionNames,
        "lookLeft",
        Math.max(0, state.gaze.x) * 0.55,
      );

      setExpression(
        vrm,
        expressionNames,
        "lookRight",
        Math.max(0, -state.gaze.x) * 0.55,
      );

      setExpression(
        vrm,
        expressionNames,
        "lookUp",
        Math.max(0, state.gaze.y) * 0.5,
      );

      setExpression(
        vrm,
        expressionNames,
        "lookDown",
        Math.max(0, -state.gaze.y) * 0.42,
      );

      expressionState.relaxed = smoothValue(
        expressionState.relaxed,
        0.06,
        delta,
        4,
        3,
      );

      setExpression(vrm, expressionNames, "relaxed", expressionState.relaxed);
    }
  }

  thinking() {}

  listening({
    vrm,
    expressionNames,
    delta,
    time,
    mouthState,
    expressionState,
    tempEuler,
    tempQuaternion,
    smileState,
  }) {
    const state = getMotionState(vrm);
    const la = this.lookAwayState;

    // --------------------
    // Mouth
    // --------------------

    mouthState.openness = smoothValue(mouthState.openness, 0, delta, 10, 10);
    mouthState.aa = smoothValue(mouthState.aa, 0, delta, 10, 10);
    mouthState.ih = smoothValue(mouthState.ih, 0, delta, 10, 10);
    mouthState.ou = smoothValue(mouthState.ou, 0, delta, 10, 10);
    mouthState.ee = smoothValue(mouthState.ee, 0, delta, 10, 10);
    mouthState.oh = smoothValue(mouthState.oh, 0, delta, 10, 10);

    setExpression(vrm, expressionNames, "aa", mouthState.aa);
    setExpression(vrm, expressionNames, "ih", mouthState.ih);
    setExpression(vrm, expressionNames, "ou", mouthState.ou);
    setExpression(vrm, expressionNames, "ee", mouthState.ee);
    setExpression(vrm, expressionNames, "oh", mouthState.oh);

    // --------------------
    // Look-around
    // --------------------

    if (
      time >= la.nextLookAway &&
      !smileState.isSmiling &&
      expressionState.happy < 0.05
    ) {
      const currentX = la.currentEye.x;
      const side =
        currentX < 0 ? 1 : currentX > 0.05 ? -1 : Math.random() < 0.5 ? -1 : 1;
      const isWide = Math.random() < 0.15;

      la.targetEye.set(
        side *
          (isWide ? 0.07 + Math.random() * 0.05 : 0.02 + Math.random() * 0.04),
        THREE.MathUtils.randFloatSpread(isWide ? 0.04 : 0.02),
      );

      la.targetHead.set(
        la.targetEye.x * 0.14,
        la.targetEye.y * 0.1,
        la.targetEye.x * -0.015,
      );

      la.nextLookAway =
        time + (isWide ? 9 + Math.random() * 7 : 6 + Math.random() * 7);
    }

    const isReturning =
      Math.abs(la.targetEye.x) < 0.001 && Math.abs(la.targetHead.x) < 0.001;
    const driftSpeed = isReturning ? 5.0 : 1.8 + Math.random() * 0.4;

    la.currentEye.lerp(la.targetEye, 1 - Math.exp(-driftSpeed * delta));
    la.currentHead.lerp(la.targetHead, 1 - Math.exp(-driftSpeed * delta));

    // --------------------
    // Gaze
    // --------------------

    if (time >= state.nextGazeShift) {
      const isGlance = Math.random() < 0.08;
      state.targetGaze.set(
        isGlance
          ? THREE.MathUtils.randFloatSpread(0.12)
          : THREE.MathUtils.randFloatSpread(0.03),
        isGlance
          ? THREE.MathUtils.randFloatSpread(0.06)
          : THREE.MathUtils.randFloat(0.0, 0.03),
      );
      state.nextGazeShift =
        time +
        (isGlance ? 0.35 + Math.random() * 0.45 : 1.5 + Math.random() * 2.5);
    }

    state.gaze.lerp(state.targetGaze, 1 - Math.exp(-4 * delta));

    // --------------------
    // Head drift
    // --------------------

    if (time >= state.nextDriftShift) {
      state.targetHeadDrift.set(
        THREE.MathUtils.randFloatSpread(0.03),
        THREE.MathUtils.randFloatSpread(0.022),
        THREE.MathUtils.randFloatSpread(0.014),
      );
      state.nextDriftShift = time + 1.5 + Math.random() * 2.8;
    }

    state.headDrift.lerp(state.targetHeadDrift, 1 - Math.exp(-1.4 * delta));

    // --------------------
    // Nodding layer
    // --------------------

    if (!this.nodState) {
      this.nodState = {
        isNodding: false,
        nextNod: time + 3 + Math.random() * 5,
        nodPhase: 0,
        nodDuration: 0,
        nodStrength: 0,
      };
    }

    const nod = this.nodState;
    let nodPitch = 0;

    if (!nod.isNodding && time >= nod.nextNod) {
      nod.isNodding = true;
      nod.nodPhase = 0;

      nod.nodDuration = 0.7 + Math.random() * 0.45;

      nod.nodStrength = 0.025 + Math.random() * 0.035;
    }

    if (nod.isNodding) {
      nod.nodPhase += delta;

      const progress = nod.nodPhase / nod.nodDuration;

      nodPitch = nod.nodStrength * Math.sin(progress * Math.PI);

      if (nod.nodPhase >= nod.nodDuration) {
        nod.isNodding = false;
        nod.nextNod = time + 4 + Math.random() * 7;
      }
    }

    // --------------------
    // Body sway
    // --------------------

    const swayX = Math.sin(time * 1.17) * 0.01 + Math.sin(time * 2.83) * 0.005;
    const swayY = Math.sin(time * 0.73) * 0.009 + Math.sin(time * 1.91) * 0.005;
    const swayZ = Math.sin(time * 0.97) * 0.008 + Math.sin(time * 1.57) * 0.004;

    const targetHead = new THREE.Vector3(
      state.headDrift.x + swayX + la.currentHead.x + nodPitch,
      state.headDrift.y + swayY + state.gaze.x * 0.06 + la.currentHead.y,
      state.headDrift.z + swayZ + state.gaze.x * -0.035 + la.currentHead.z,
    );

    state.headMotion.lerp(targetHead, 1 - Math.exp(-5 * delta));
    state.bodyMotion.lerp(state.headMotion, 1 - Math.exp(-2.5 * delta));
    state.armMotion.lerp(state.bodyMotion, 1 - Math.exp(-1.8 * delta));

    // --------------------
    // Breathing
    // --------------------

    const breathing = Math.sin(time * 1.2) * 0.012 * 0.55;

    // --------------------
    // Arms
    // --------------------

    const armBreathing = Math.sin(time * 1.2) * 0.012 * 0.55;
    const swayAmp = 0.0045;
    const armSwayL =
      Math.sin(time * 0.5) * swayAmp + Math.sin(time * 0.9) * swayAmp * 0.25;
    const armSwayR =
      Math.sin(time * 0.52 + 0.6) * swayAmp +
      Math.sin(time * 0.88 + 0.3) * swayAmp * 0.25;

    const upperArmX = state.armMotion.x * 0.1 + armBreathing * 0.25 + armSwayL;
    const upperArmY = state.armMotion.y * 0.08;
    const upperArmZ = state.armMotion.z * 0.12;

    applyBoneRotation(
      state.leftUpperArm,
      state.baseLeftUpperArm,
      upperArmX,
      upperArmY + 0.1,
      upperArmZ - 1.35,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.rightUpperArm,
      state.baseRightUpperArm,
      upperArmX - armSwayL + armSwayR,
      upperArmY - 0.1,
      upperArmZ + 1.35,
      tempEuler,
      tempQuaternion,
    );

    // --------------------
    // Body bones
    // --------------------

    applyBoneRotation(
      state.spine,
      state.baseSpine,
      state.bodyMotion.x * 0.18 + breathing * 0.3,
      state.bodyMotion.y * 0.15,
      state.bodyMotion.z * 0.12,
      tempEuler,
      tempQuaternion,
    );

    applyBoneRotation(
      state.chest,
      state.baseChest,
      state.bodyMotion.x * 0.25 + breathing,
      state.bodyMotion.y * 0.22,
      state.bodyMotion.z * 0.18,
      tempEuler,
      tempQuaternion,
    );

    if (!this.expressionOverrideActive) {
      applyBoneRotation(
        state.neck,
        state.baseNeck,
        state.headMotion.x * 0.35,
        state.headMotion.y * 0.35,
        state.headMotion.z * 0.3,
        tempEuler,
        tempQuaternion,
      );

      applyBoneRotation(
        state.head,
        state.baseHead,
        state.headMotion.x,
        state.headMotion.y,
        state.headMotion.z,
        tempEuler,
        tempQuaternion,
      );

      // --------------------
      // Eyes
      // --------------------

      const eyeX =
        (state.gaze.y + la.currentEye.y) * 0.3 + Math.sin(time * 2.7) * 0.006;
      const eyeY =
        (state.gaze.x + la.currentEye.x) * 0.42 + Math.sin(time * 1.8) * 0.008;

      applyBoneRotation(
        state.leftEye,
        state.baseLeftEye,
        eyeX,
        eyeY,
        0,
        tempEuler,
        tempQuaternion,
      );

      applyBoneRotation(
        state.rightEye,
        state.baseRightEye,
        eyeX,
        eyeY,
        0,
        tempEuler,
        tempQuaternion,
      );

      // --------------------
      // Expressions
      // --------------------

      expressionState.happy = smoothValue(
        expressionState.happy,
        time < state.smileUntil ? 0.32 : 0.1,
        delta,
        4,
        2.5,
      );

      expressionState.relaxed = smoothValue(
        expressionState.relaxed,
        0.08,
        delta,
        4,
        3,
      );

      setExpression(vrm, expressionNames, "happy", expressionState.happy);
      setExpression(vrm, expressionNames, "relaxed", expressionState.relaxed);
    }
  }
}

/* =========================================================
   CAMERA CONTROL SYSTEM
========================================================= */
function createCameraReturnState() {
  return {
    lastInteractionAt: 0,
    isInteracting: false,
    isAutoReturning: false,
  };
}

function setupCameraControls(controls, clock, cameraReturnState) {
  const markCameraInteraction = () => {
    if (cameraReturnState.isAutoReturning) return;
    cameraReturnState.lastInteractionAt = clock.getElapsedTime();
  };

  const startCameraInteraction = () => {
    cameraReturnState.isInteracting = true;
    markCameraInteraction();
  };

  const endCameraInteraction = () => {
    cameraReturnState.isInteracting = false;
    markCameraInteraction();
  };

  controls?.addEventListener("start", startCameraInteraction);
  controls?.addEventListener("change", markCameraInteraction);
  controls?.addEventListener("end", endCameraInteraction);

  return {
    markCameraInteraction,
    startCameraInteraction,
    endCameraInteraction,
  };
}

function updateCameraReturn(
  camera,
  controls,
  cameraReturnState,
  defaultCameraPosition,
  defaultCameraTarget,
  delta,
  time,
  config,
) {
  if (!controls) return;

  const shouldReturnCamera =
    config?.free_cam_enabled !== true &&
    !cameraReturnState.isInteracting &&
    time - cameraReturnState.lastInteractionAt >= CAMERA_IDLE_RETURN_DELAY;

  if (shouldReturnCamera) {
    const ease = 1 - Math.exp(-CAMERA_RETURN_SPEED * delta);
    camera.position.lerp(defaultCameraPosition, ease);
    controls.target.lerp(defaultCameraTarget, ease);

    if (
      camera.position.distanceToSquared(defaultCameraPosition) <=
        CAMERA_RETURN_EPSILON &&
      controls.target.distanceToSquared(defaultCameraTarget) <=
        CAMERA_RETURN_EPSILON
    ) {
      camera.position.copy(defaultCameraPosition);
      controls.target.copy(defaultCameraTarget);
    }
  }

  cameraReturnState.isAutoReturning = shouldReturnCamera;
  controls.update();
  cameraReturnState.isAutoReturning = false;
}

/* =========================================================
   AVATAR SCENE CLASS
========================================================= */
export class AvatarScene {
  constructor(container, { orbitControlsEnabled, enableEffects, isDark }) {
    this.container = container;
    this.isDark = isDark;

    this.renderer = createRenderer(container);
    this.scene = createScene();
    this.camera = createCamera(container);
    this.controls = createControls(this.camera, this.renderer);
    this.controls.enabled = orbitControlsEnabled;

    this.textureLoader = new THREE.TextureLoader();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.setBackground(isDark);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.05,
      0.25,
      0.35,
    );

    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.lights = updateThemeVisuals(
      this.renderer,
      this.scene,
      isDark,
      enableEffects,
    );

    this.cleanupResize = handleResize(
      container,
      this.camera,
      this.renderer,
      this.composer,
    );

    this.handleBackgroundResize = () => {
      this.setBackground(this.isDark);
    };

    window.addEventListener("resize", this.handleBackgroundResize);
  }

  setBackground(isDark) {
    this.isDark = isDark;

    const isMobile = window.innerWidth <= 768;

    const image = isMobile
      ? isDark
        ? "/backgrounds/mobile/night.png"
        : "/backgrounds/mobile/day.png"
      : isDark
        ? "/backgrounds/night.png"
        : "/backgrounds/day.png";

    this.textureLoader.load(image, (texture) => {
      if (this.isDark === isDark) {
        this.scene.background = texture;
      }

      texture.colorSpace = THREE.SRGBColorSpace;
    });
  }

  setOrbitControlsEnabled(enabled) {
    if (this.controls) {
      this.controls.enabled = enabled;
    }
  }

  setVisuals({ isDark, enableEffects }) {
    this.isDark = isDark;

    this.setBackground(isDark);

    this.lights = updateThemeVisuals(
      this.renderer,
      this.scene,
      isDark,
      enableEffects,
    );
  }

  render(enableEffects) {
    if (enableEffects) {
      this.composer.render();
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.cleanupResize?.();
    this.controls?.dispose();
    this.renderer?.dispose();

    window.removeEventListener("resize", this.handleBackgroundResize);

    if (this.renderer?.domElement?.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

/* =========================================================
   AVATAR CHARACTER CLASS
========================================================= */
export class AvatarCharacter {
  constructor() {
    this.vrm = null;
    this.modelName = null;
    this.state = CharacterState.UNLOADED;
    this.expressionNames = new Set();
    this.blinkState = {
      timer: 0,
      nextBlinkTime: 3 + Math.random() * 4,
      isBlinking: false,
      duration: 0.18,
    };
    this.mouthState = {
      openness: 0,
      aa: 0,
      ih: 0,
      ou: 0,
      ee: 0,
      oh: 0,
    };
    this.expressionState = {
      happy: 0,
      relaxed: 0,
    };
    this.readAudioShape = createAudioReader();
    this.tempEuler = new THREE.Euler();
    this.tempQuaternion = new THREE.Quaternion();

    this.mood = new AvatarMood();

    this.AvatarAnimator = new AvatarAnimator(this.mood);
    this.mood.setAnimator(this.AvatarAnimator);
  }

  get isLoaded() {
    return Boolean(this.vrm);
  }

  setCharacterState(state) {
    this.setState(state);
  }

  setMood(mood) {
    if (this.mood) {
      this.mood.setMood(mood);
    }
  }

  setState(nextState) {
    if (this.state !== nextState) {
      this.state = nextState;
    }
  }

  async load(scene, modelName, signal) {
    this.setState(CharacterState.LOADING);

    if (this.vrm && this.modelName === modelName) {
      ensureVisible(this.vrm);
      this.updateState(null);
      return this.vrm;
    }

    const nextVrm = await loadVRM(scene, modelName, signal);
    const previousVrm = this.vrm;

    this.vrm = nextVrm;
    this.modelName = modelName;
    this.expressionNames = getExpressionNames(nextVrm);
    ensureVisible(nextVrm);

    if (previousVrm) {
      disposeVRM(scene, previousVrm);
    }

    this.updateState(null);
    return nextVrm;
  }

  dispose(scene) {
    if (this.vrm) {
      disposeVRM(scene, this.vrm);
    }

    this.vrm = null;
    this.modelName = null;
    this.expressionNames = new Set();
    this.setState(CharacterState.UNLOADED);
  }

  setState(nextState) {
    if (this.state !== nextState) {
      this.state = nextState;
    }
  }

  updateState(lipSyncState) {
    if (!this.vrm) {
      this.setState(CharacterState.UNLOADED);
      return;
    }

    this.setState(
      lipSyncState?.isPlaying ? CharacterState.TALKING : CharacterState.IDLE,
    );
  }

  setAvatarState(state) {
    this.state = state;
  }

  update({ delta, time, lipSyncState }) {
    if (!this.vrm) return;

    if (lipSyncState?.isPlaying) {
      this.setState(CharacterState.TALKING);
    }

    this.AvatarAnimator.animate({
      vrm: this.vrm,
      expressionNames: this.expressionNames,
      characterState: this.state,
      lipSyncState,
      delta,
      time,
      mouthState: this.mouthState,
      readAudioShape: this.readAudioShape,
      expressionState: this.expressionState,
      tempEuler: this.tempEuler,
      tempQuaternion: this.tempQuaternion,
      blinkState: this.blinkState,
    });

    this.vrm.update(delta);
  }
}

// Avatar mood class
export class AvatarMood {
  constructor() {
    this.mood = "neutral";
    this.animator = null;
  }

  setAnimator(animator) {
    this.animator = animator;
  }

  setMood(mood) {
    console.log(`Setting mood to: ${mood}`);

    if (this.animator) {
      this.animator.setExpressionOverrideActive(true);
      this.animator.startMoodAnimation(mood);
    }

    this.mood = mood;
  }

  logMood() {
    console.log(`Current mood: ${this.mood}`);
  }
}

/* =========================================================
   MAIN ANIMATION LOOP
========================================================= */
export function startAnimation(
  avatarScene,
  avatarCharacter,
  getLipSyncState,
  getEnableEffects,
  getConfigRef,
) {
  let id;
  const clock = new THREE.Clock();
  const { camera, controls } = avatarScene;
  const defaultCameraPosition = DEFAULT_CAMERA_POSITION.clone();
  const defaultCameraTarget = DEFAULT_CAMERA_TARGET.clone();
  const cameraReturnState = createCameraReturnState();
  const {
    startCameraInteraction,
    markCameraInteraction,
    endCameraInteraction,
  } = setupCameraControls(controls, clock, cameraReturnState);

  const animate = () => {
    id = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    const config = getConfigRef?.();

    if (config?.free_cam_enabled) {
      controls.updateLimits(false);
    } else {
      controls.updateLimits(true);
    }

    updateCameraReturn(
      camera,
      controls,
      cameraReturnState,
      defaultCameraPosition,
      defaultCameraTarget,
      delta,
      time,
      config,
    );

    avatarScene.renderer.domElement.style.pointerEvents = "auto";
    avatarCharacter.update({
      delta,
      time,
      lipSyncState: getLipSyncState?.(),
    });

    updateLights(avatarScene.lights, time);
    avatarScene.render(getEnableEffects?.());
  };

  animate();

  return () => {
    controls?.removeEventListener("start", startCameraInteraction);
    controls?.removeEventListener("change", markCameraInteraction);
    controls?.removeEventListener("end", endCameraInteraction);
    cancelAnimationFrame(id);
  };
}
