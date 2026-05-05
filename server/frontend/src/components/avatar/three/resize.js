export function handleResize(container, camera, renderer, composer) {
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
  };

  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}
