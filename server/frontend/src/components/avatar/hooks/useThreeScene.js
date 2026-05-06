import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

import {
  createRenderer,
  createScene,
  createCamera,
  createControls,
} from "../three/core";

import { updateThemeVisuals } from "../three/lighting";
import { startAnimation } from "../three/animation";
import { handleResize } from "../three/resize";
import { disposeVRM } from "../three/vrmLoader";

export function useThreeScene({
  mountRef,
  orbitControlsEnabled,
  enableEffects,
  isDark,
  isRendering,
  lipSyncState,
}) {
  const vrmRef = useRef(null);

  const sceneAPI = useRef({}).current;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = createRenderer(container);
    const scene = createScene();
    const camera = createCamera(container);
    const controls = createControls(camera, renderer);

    controls.enabled = orbitControlsEnabled;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.08,
      0.3,
      0.9,
    );

    composer.addPass(bloom);

    const lights = updateThemeVisuals(renderer, scene, isDark, enableEffects);

    const resize = handleResize(container, camera, renderer, composer);

    sceneAPI.scene = scene;
    sceneAPI.camera = camera;

    let stopAnimation = null;

    if (isRendering) {
      stopAnimation = startAnimation(
        renderer,
        scene,
        camera,
        controls,
        composer,
        () => vrmRef.current,
        () => lights,
        () => lipSyncState,
        () => enableEffects,
      );
    }

    return () => {
      resize();
      if (stopAnimation) stopAnimation();

      controls.dispose();
      disposeVRM(scene, vrmRef.current);

      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [isRendering]);

  return { vrmRef, sceneAPI };
}
