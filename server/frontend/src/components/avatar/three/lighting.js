import * as THREE from "three";

export function updateThemeVisuals(renderer, scene, isDark, enableEffects) {
  const bgColor = isDark ? 0x0b0b0f : 0xf5f5f5;

  renderer.setClearColor(bgColor, 1);

  const fogDensity = enableEffects ? (isDark ? 0.03 : 0.015) : 0.005;
  scene.fog = enableEffects ? new THREE.FogExp2(bgColor, fogDensity) : null;

  const lights = scene.children.filter((c) => c instanceof THREE.Light);
  lights.forEach((l) => scene.remove(l));

  const ambientLight = new THREE.AmbientLight(
    0xffffff,
    isDark ? 0.24 : 0.4
  );

  const keyLight = new THREE.DirectionalLight(
    isDark ? 0xffddc8 : 0xffffff,
    isDark ? 0.38 : 0.5
  );
  keyLight.position.set(0.9, 2.0, 1.7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;

  const fillLight = new THREE.DirectionalLight(
    isDark ? 0xa8c4ff : 0xb9d4ff,
    isDark ? 0.08 : 0.12
  );
  fillLight.position.set(-1.1, 1.1, 1.4);

  const rimLight = new THREE.DirectionalLight(
    0xffffff,
    isDark ? 0.08 : 0.12
  );
  rimLight.position.set(-0.6, 1.8, -2.2);

  const faceLight = new THREE.SpotLight(
    isDark ? 0xffceb0 : 0xfff1e6,
    isDark ? 1.35 : 1.0,
    7,
    Math.PI / 7,
    0.7,
    1.5
  );
  faceLight.position.set(0, 1.7, 1.15);
  faceLight.target.position.set(0, 1.45, 0);

  scene.add(
    ambientLight,
    keyLight,
    fillLight,
    rimLight,
    faceLight,
    faceLight.target
  );

  return { keyLight, fillLight, faceLight };
}
