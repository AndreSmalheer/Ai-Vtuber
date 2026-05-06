import * as THREE from "three";
import { getBone } from "../core/bones";

const motionStates = new WeakMap();

export function createMotionState(vrm) {
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

export function getMotionState(vrm) {
  let state = motionStates.get(vrm);
  if (!state) {
    state = createMotionState(vrm);
    motionStates.set(vrm, state);
  }
  return state;
}
