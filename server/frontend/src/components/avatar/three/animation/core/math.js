import * as THREE from "three";

export function clamp01(value) {
  return THREE.MathUtils.clamp(value, 0, 1);
}

export function smoothValue(current, target, delta, attack = 20, release = 12) {
  const speed = target > current ? attack : release;
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
}

export function setExpression(vrm, names, name, value) {
  if (names.has(name) && vrm.expressionManager) {
    vrm.expressionManager.setValue(name, clamp01(value));
  }
}

export function applyBoneRotation(
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
