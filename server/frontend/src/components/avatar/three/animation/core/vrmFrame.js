import { updateBlink } from "../motion/blink";
import { updateLipSync } from "../motion/lipSync";
import { clamp01, smoothValue } from "./math";
import { setExpression, applyBoneRotation } from "./math";
import { updateFaceMotion } from "../motion/faceMotion";
import { getMotionState } from "../motion/state"

export function updateVrmFrame({
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
      clamp01,
      smoothValue,
      setExpression,
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
