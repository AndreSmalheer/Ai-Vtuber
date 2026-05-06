import * as THREE from "three";
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from "./core";

const CAMERA_IDLE_RETURN_DELAY = 0.1;
const CAMERA_RETURN_SPEED = 4.2;
const CAMERA_RETURN_EPSILON = 0.0001;

const motionStates = new WeakMap();

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

function getExpressionNames(vrm) {
  const expressions = vrm.expressionManager?.expressions || [];
  return new Set(expressions.map((expression) => expression.expressionName));
}

function getBone(vrm, name) {
  return (
    vrm.humanoid?.getNormalizedBoneNode?.(name) ||
    vrm.humanoid?.getRawBoneNode?.(name) ||
    null
  );
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

function createAudioReader(clamp01Fn) {
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
        volume: clamp01Fn((rms - 0.012) * 9),
        low: bandAverage(1, 8),
        mid: bandAverage(8, 32),
        high: bandAverage(32, 96),
        fallback: false,
      };
    }

    const pulse =
      0.55 + Math.sin(time * 15) * 0.28 + Math.sin(time * 27) * 0.12;
    return {
      volume: clamp01Fn(pulse),
      low: 0.45 + Math.sin(time * 7) * 0.18,
      mid: 0.55 + Math.sin(time * 11) * 0.2,
      high: 0.35 + Math.sin(time * 13) * 0.15,
      fallback: true,
    };
  };
}

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
    nextSmile: 4.0 + Math.random() * 6.0,
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

function updateFaceMotion(
  vrm,
  expressionNames,
  lipSyncState,
  audio,
  delta,
  time,
  expressionState,
  tempEuler,
  tempQuaternion,
) {
  const state = getMotionState(vrm);
  const speaking = Boolean(lipSyncState?.isPlaying);
  const speechEnergy = speaking ? audio.volume : 0;

  if (time >= state.nextGazeShift) {
    if (speaking) {
      const isGlance = Math.random() < 0.06;
      if (isGlance) {
        state.targetGaze.set(
          THREE.MathUtils.randFloatSpread(0.04),
          THREE.MathUtils.randFloatSpread(0.02),
        );
        state.nextGazeShift = time + 0.35 + Math.random() * 0.5;
      } else {
        state.targetGaze.set(
          THREE.MathUtils.randFloatSpread(0.015),
          THREE.MathUtils.randFloat(-0.008, 0.016),
        );
        state.nextGazeShift = time + 1.0 + Math.random() * 1.4;
      }
    } else {
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
  }

  if (time >= state.nextSmile && !speaking) {
    state.smileUntil = time + 0.7 + Math.random() * 1.2;
    state.nextSmile = state.smileUntil + 8.0 + Math.random() * 12.0;
  }

  if (speaking && time < state.smileUntil) {
    state.smileUntil = time;
  }

  const gazeEase = 1 - Math.exp(-(speaking ? 10 : 4) * delta);
  state.gaze.lerp(state.targetGaze, gazeEase);

  if (time >= state.nextDriftShift) {
    if (speaking) {
      state.targetHeadDrift.set(
        THREE.MathUtils.randFloatSpread(0.01),
        THREE.MathUtils.randFloatSpread(0.008),
        THREE.MathUtils.randFloatSpread(0.006),
      );
      state.nextDriftShift = time + 1.9 + Math.random() * 2.3;
    } else {
      state.targetHeadDrift.set(
        THREE.MathUtils.randFloatSpread(0.022),
        THREE.MathUtils.randFloatSpread(0.016),
        THREE.MathUtils.randFloatSpread(0.01),
      );
      state.nextDriftShift = time + 1.8 + Math.random() * 3.2;
    }
  }

  const driftSpeed = speaking ? 2.0 : 1.4;
  state.headDrift.lerp(
    state.targetHeadDrift,
    1 - Math.exp(-driftSpeed * delta),
  );

  state.energySmooth = THREE.MathUtils.lerp(
    state.energySmooth,
    speechEnergy,
    1 - Math.exp(-8 * delta),
  );

  const nodTarget = speaking
    ? state.energySmooth * 0.028 + speechEnergy * 0.01
    : 0;
  state.speechNod = THREE.MathUtils.lerp(
    state.speechNod,
    nodTarget,
    1 - Math.exp(-6.5 * delta),
  );

  const tiltTarget = speaking
    ? Math.sin(time * 1.15) * 0.01 * state.energySmooth +
      state.energySmooth * 0.006
    : 0;
  state.speechTilt = THREE.MathUtils.lerp(
    state.speechTilt,
    tiltTarget,
    1 - Math.exp(-4.5 * delta),
  );

  const swayX = Math.sin(time * 1.17) * 0.008 + Math.sin(time * 2.83) * 0.004;
  const swayY = Math.sin(time * 0.73) * 0.007 + Math.sin(time * 1.91) * 0.004;
  const swayZ = Math.sin(time * 0.97) * 0.006 + Math.sin(time * 1.57) * 0.003;

  const speechFlow = speaking
    ? new THREE.Vector3(
        Math.sin(time * 2.1) * 0.006 * (0.4 + state.energySmooth),
        Math.sin(time * 1.7 + 0.8) * 0.004 * (0.35 + state.energySmooth),
        Math.sin(time * 2.6 + 1.4) * 0.003 * (0.35 + state.energySmooth),
      )
    : new THREE.Vector3(0, 0, 0);

  const targetHead = new THREE.Vector3(
    state.headDrift.x + swayX + state.speechNod + speechFlow.x,
    state.headDrift.y + swayY + state.gaze.x * 0.06 + speechFlow.y,
    state.headDrift.z +
      swayZ +
      state.gaze.x * -0.035 +
      state.speechTilt +
      speechFlow.z,
  );

  const motionSpeed = speaking ? 9.0 : 5.0;
  state.headMotion.lerp(targetHead, 1 - Math.exp(-motionSpeed * delta));

  const bodyFollowSpeed = speaking ? 4.0 : 2.5;
  state.bodyMotion.lerp(
    state.headMotion,
    1 - Math.exp(-bodyFollowSpeed * delta),
  );

  const armFollowSpeed = speaking ? 2.8 : 1.8;
  state.armMotion.lerp(state.bodyMotion, 1 - Math.exp(-armFollowSpeed * delta));
  state.handMotion.lerp(
    state.armMotion,
    1 - Math.exp(-(armFollowSpeed * 0.8) * delta),
  );

  const breathCycle = speaking ? 0.65 : 0.55;
  const breathing =
    Math.sin(time * (speaking ? 1.5 : 1.2)) * 0.012 * breathCycle;

  const targetShoulder = speaking ? speechEnergy * 0.025 : 0;
  state.shoulderMotion = THREE.MathUtils.lerp(
    state.shoulderMotion,
    targetShoulder,
    1 - Math.exp(-6 * delta),
  );

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

  const shoulderX = state.shoulderMotion + state.bodyMotion.x * 0.08;
  const shoulderZ = state.bodyMotion.z * 0.15;

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

  const smileTarget = time < state.smileUntil ? 0.28 : 0.05;
  expressionState.happy = smoothValue(
    expressionState.happy,
    smileTarget,
    delta,
    4,
    2.5,
  );
  expressionState.relaxed = smoothValue(
    expressionState.relaxed,
    speaking ? 0.06 : 0.12,
    delta,
    4,
    3,
  );

  setExpression(vrm, expressionNames, "happy", expressionState.happy);
  setExpression(vrm, expressionNames, "relaxed", expressionState.relaxed);
}

function updateBlink(blinkState, vrm, expressionNames, delta) {
  blinkState.timer += delta;

  if (!blinkState.isBlinking && blinkState.timer >= blinkState.nextBlinkTime) {
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

function updateCameraReturn(
  camera,
  controls,
  cameraReturnState,
  defaultCameraPosition,
  defaultCameraTarget,
  delta,
  time,
) {
  if (!controls) return;

  const shouldReturnCamera =
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

function updateVrmFrame({
  vrm,
  expressionNames,
  lipSyncState,
  delta,
  time,
  blinkState,
  mouthState,
  readAudioShape,
  expressionState,
  tempEuler,
  tempQuaternion,
}) {
  updateBlink(blinkState, vrm, expressionNames, delta);

  if (vrm.expressionManager) {
    const audio = updateLipSync(
      vrm,
      expressionNames,
      lipSyncState,
      delta,
      time,
      mouthState,
      readAudioShape,
    );

    updateFaceMotion(
      vrm,
      expressionNames,
      lipSyncState,
      audio,
      delta,
      time,
      expressionState,
      tempEuler,
      tempQuaternion,
    );

    updateBodyPose(vrm, time, tempEuler, tempQuaternion);
  }

  vrm.update(delta);
}

function updateBodyPose(vrm, time, tempEuler, tempQuaternion) {
  const state = getMotionState(vrm);

  const armBreathing = Math.sin(time * 1.2) * 0.012 * 0.55;
  const swayAmp = 0.0035;

  const armSwayL =
    Math.sin(time * 0.5) * swayAmp + Math.sin(time * 0.9) * swayAmp * 0.25;

  const armSwayR =
    Math.sin(time * 0.52 + 0.6) * swayAmp +
    Math.sin(time * 0.88 + 0.3) * swayAmp * 0.25;

  const presenceShift = 0;

  const upperArmX =
    state.armMotion.x * 0.1 + armBreathing * 0.25 + armSwayL + presenceShift;
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
}

export function startAnimation(
  renderer,
  scene,
  camera,
  controls,
  composer,
  getVRM,
  getLights,
  getLipSyncState,
  getEnableEffects,
) {
  let id;
  const clock = new THREE.Clock();

  const tempEuler = new THREE.Euler();
  const tempQuaternion = new THREE.Quaternion();

  const defaultCameraPosition = DEFAULT_CAMERA_POSITION.clone();
  const defaultCameraTarget = DEFAULT_CAMERA_TARGET.clone();

  const cameraReturnState = createCameraReturnState();
  const {
    startCameraInteraction,
    markCameraInteraction,
    endCameraInteraction,
  } = setupCameraControls(controls, clock, cameraReturnState);

  const blinkState = {
    timer: 0,
    nextBlinkTime: 3 + Math.random() * 4,
    isBlinking: false,
    duration: 0.18,
  };

  const mouthState = {
    openness: 0,
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
  };

  const expressionState = {
    happy: 0,
    relaxed: 0,
  };

  const returnSmileState = {
    pending: false,
  };

  const resetSmile = (vrm) => {
    const state = getMotionState(vrm);
    state.smileUntil = 0;
    state.nextSmile = Infinity;
    expressionState.happy = 0;
    expressionState.relaxed = 0;

    const names = getExpressionNames(vrm);
    setExpression(vrm, names, "happy", 0);
    setExpression(vrm, names, "relaxed", 0);
  };

  const triggerReturnSmile = (vrm) => {
    const state = getMotionState(vrm);
    const now = clock.getElapsedTime();

    // Sets the duration for the "welcome back" smile without altering normal smile intensity/duration logic
    state.smileUntil = now + 0.35 + Math.random() * 0.25;
    // Schedules the next random smile to resume normal behavior without altering its scheduling
    state.nextSmile = state.smileUntil + 8.0 + Math.random() * 12.0;
    returnSmileState.pending = false;
  };

  const handleVisibilityChange = () => {
    const vrm = getVRM?.();

    if (document.hidden) {
      if (vrm) {
        resetSmile(vrm);
      }
      returnSmileState.pending = true;
      return;
    }

    returnSmileState.pending = true;
  };

  const readAudioShape = createAudioReader(clamp01);

  const animate = () => {
    id = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    updateCameraReturn(
      camera,
      controls,
      cameraReturnState,
      defaultCameraPosition,
      defaultCameraTarget,
      delta,
      time,
    );

    renderer.domElement.style.pointerEvents = "auto";

    const vrm = getVRM();
    if (vrm && returnSmileState.pending && !document.hidden) {
      triggerReturnSmile(vrm);
    }
    if (vrm) {
      const expressionNames = getExpressionNames(vrm);

      updateVrmFrame({
        vrm,
        expressionNames,
        lipSyncState: getLipSyncState?.(),
        delta,
        time,
        blinkState,
        mouthState,
        readAudioShape,
        expressionState,
        tempEuler,
        tempQuaternion,
      });
    }

    updateLights(getLights?.(), time);

    if (getEnableEffects?.()) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  };

  animate();

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    controls?.removeEventListener("start", startCameraInteraction);
    controls?.removeEventListener("change", markCameraInteraction);
    controls?.removeEventListener("end", endCameraInteraction);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    cancelAnimationFrame(id);
  };
}
