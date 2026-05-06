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
