import "./avatar.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

import {
  createRenderer,
  createScene,
  createCamera,
  createControls,
} from "./three/core";

import { updateThemeVisuals } from "./three/lighting";
import { startAnimation } from "./three/animation";
import { handleResize } from "./three/resize";

import { useVrmLoader } from "./hooks/useVRMLoader";
import { useAvatarStateMachine } from "./hooks/useAvatarStateMachine";
import { AvatarState } from "./hooks/avatarState";

export default function Avatar({
  visible = true,
  avatarModel,
  lipSyncState,
  orbitControlsEnabled = true,
  enableEffects = true,
}) {
  const mountRef = useRef(null);

  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const composerRef = useRef(null);
  const bloomPassRef = useRef(null);
  const vrmRef = useRef(null);
  const lightsRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const { state, setState } = useAvatarStateMachine();

  // ----------------------------
  // INIT THREE SCENE (RUN ONCE)
  // ----------------------------
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

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.08,
      0.3,
      0.9
    );

    composer.addPass(bloomPass);

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    lightsRef.current = updateThemeVisuals(
      renderer,
      scene,
      document.body.classList.contains("dark"),
      enableEffects
    );

    const resize = handleResize(container, camera, renderer, composer);

    return () => {
      resize();
      controls.dispose();
      renderer.dispose();

      if (vrmRef.current) {
        vrmRef.current = null;
      }

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ----------------------------
  // VRM LOADER (STATE DRIVEN)
  // ----------------------------
  useVrmLoader({
    scene: sceneRef.current,
    avatarModel,
    state,
    setState,
    vrmRef,
    setLoading,
  });

  // ----------------------------
  // ANIMATION LOOP
  // ----------------------------
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const composer = composerRef.current;

    if (!renderer || !scene || !camera) return;

    if (state !== AvatarState.ACTIVE) return;

    const stop = startAnimation(
      renderer,
      scene,
      camera,
      controls,
      composer,
      () => vrmRef.current,
      () => lightsRef.current,
      () => lipSyncState,
      () => enableEffects,
      () => state
    );

    return () => stop?.();
  }, [state]);

  return (
    <div
      className={`three-js-container ${visible ? "" : "three-js-container--hidden"}`}
      ref={mountRef}
    >
      {loading && (
        <div className="avatar-loader">
          <div className="avatar-loader__ring" />
        </div>
      )}
    </div>
  );
}
