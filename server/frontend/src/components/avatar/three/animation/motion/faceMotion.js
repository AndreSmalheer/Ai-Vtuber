import * as THREE from "three";
import { getMotionState } from "./state";
import { applyBoneRotation, setExpression, smoothValue } from "../core/math";

export function updateFaceMotion(
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
    const now = Math.max(time, 0);
    if (state.nextSmile === 0) {
      state.nextSmile = now + 5.0 + Math.random() * 5.0;
    } else {
      state.smileUntil = now + 0.7 + Math.random() * 1.2;
      state.nextSmile = state.smileUntil + 8.0 + Math.random() * 12.0;
    }
  }

  if (speaking && time < state.smileUntil) {
    state.smileUntil = time;
  }

  if (state.smileUntil > time + 5.0) {
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
