import {setExpression } from "../core/math";

export function updateBlink(blinkState, vrm, expressionNames, delta) {
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
