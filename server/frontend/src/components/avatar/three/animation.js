import * as THREE from "three";
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from "./core";
import { createCameraReturnState } from "./animation/camera/cameraReturn";
import setupCameraControls from "./animation/camera/cameraControls";
import { createAudioReader } from "./animation/motion/lipSync";
import {clamp01} from "./animation/core/math";
import { updateCameraReturn } from "./animation/camera/cameraReturn"
import { updateLights } from  "./animation/core/lights"
import { getExpressionNames } from "./animation/core/bones.js"
import { updateVrmFrame } from "./animation/core/vrmFrame.js";

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

  return () => {
    controls?.removeEventListener("start", startCameraInteraction);
    controls?.removeEventListener("change", markCameraInteraction);
    controls?.removeEventListener("end", endCameraInteraction);
    cancelAnimationFrame(id);
  };
}
