import { configPromise } from "../config.js";
const config = await configPromise;
let blinkDuration = config.blinkDuration;
let blink = config.blink;
let blinkStartTime = 0;
let isBlinking = false;
let nextBlinkTime = 0;

export function updateBlink(vrm, clock) {
  if (!blink) return;
  if (!vrm) return;
  const time = clock.elapsedTime;
  if (!isBlinking && time > nextBlinkTime) {
    isBlinking = true;
    blinkStartTime = time;
    blinkDuration = 0.05 + Math.random() * 0.1;
    nextBlinkTime = time + 1 + Math.random() * 3;
  }
  let blinkValue = 0;
  if (isBlinking) {
    let t = (time - blinkStartTime) / blinkDuration;
    if (t >= 1) {
      t = 1;
      isBlinking = false;
    }
    blinkValue = Math.sin(Math.PI * t);
  }
  vrm.expressionManager.setValue("blinkLeft", blinkValue);
  vrm.expressionManager.setValue("blinkRight", blinkValue);
}
