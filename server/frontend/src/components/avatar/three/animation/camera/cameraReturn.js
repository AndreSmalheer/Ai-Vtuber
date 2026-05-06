const CAMERA_IDLE_RETURN_DELAY = 0.1;
const CAMERA_RETURN_SPEED = 4.2;
const CAMERA_RETURN_EPSILON = 0.0001;

export function updateCameraReturn(
  camera,
  controls,
  cameraReturnState,
  defaultCameraPosition,
  defaultCameraTarget,
  delta,
  time,
) {
  if (!controls) return;

  const shouldReturnCamera =
    !cameraReturnState.isInteracting &&
    time - cameraReturnState.lastInteractionAt >= CAMERA_IDLE_RETURN_DELAY;

  if (shouldReturnCamera) {
    const ease = 1 - Math.exp(-CAMERA_RETURN_SPEED * delta);
    camera.position.lerp(defaultCameraPosition, ease);
    controls.target.lerp(defaultCameraTarget, ease);

    if (
      camera.position.distanceToSquared(defaultCameraPosition) <= CAMERA_RETURN_EPSILON &&
      controls.target.distanceToSquared(defaultCameraTarget) <= CAMERA_RETURN_EPSILON
    ) {
      camera.position.copy(defaultCameraPosition);
      controls.target.copy(defaultCameraTarget);
    }
  }

  cameraReturnState.isAutoReturning = shouldReturnCamera;
  controls.update();
  cameraReturnState.isAutoReturning = false;
}

export function createCameraReturnState() {
  return {
    lastInteractionAt: 0,
    isInteracting: false,
    isAutoReturning: false,
  };
}
