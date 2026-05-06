export function updateLights(lights, time) {
  if (lights?.keyLight) {
    lights.keyLight.intensity = 0.5 + Math.sin(time * 0.6) * 0.03;
  }

  if (lights?.faceLight) {
    lights.faceLight.intensity = 0.75 + Math.sin(time * 0.8) * 0.02;
    lights.faceLight.position.x = Math.sin(time * 0.3) * 0.05;
    lights.faceLight.position.y = 1.8 + Math.sin(time * 0.4) * 0.02;
  }
}
