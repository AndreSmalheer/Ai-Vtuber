export default function setupCameraControls(controls, clock, cameraReturnState) {
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
