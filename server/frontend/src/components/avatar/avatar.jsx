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
import { disposeVRM, loadVRM } from "./three/vrmLoader";
import { startAnimation } from "./three/animation";
import { handleResize } from "./three/resize";

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
  const lipSyncStateRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isInactive, setIsInactive] = useState(false);
  const [isRendering, setIsRendering] = useState(!document.hidden);
  const [isDark, setIsDark] = useState(
    document.body.classList.contains("dark"),
  );

  const unloadTimeoutRef = useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsRendering(false);
        unloadTimeoutRef.current = setTimeout(() => {
          setIsInactive(true);
        }, 60000);
      } else {
        setIsRendering(true);
        // User came back
        if (unloadTimeoutRef.current) {
          clearTimeout(unloadTimeoutRef.current);
          unloadTimeoutRef.current = null;
        }
        setIsInactive(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (unloadTimeoutRef.current) clearTimeout(unloadTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    lipSyncStateRef.current = lipSyncState;
  }, [lipSyncState]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = orbitControlsEnabled;
    }
  }, [orbitControlsEnabled]);

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.body.classList.contains("dark"));
    });

    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = createRenderer(container);
    const scene = createScene();
    const camera = createCamera(container);
    const controls = createControls(camera, renderer);
    controls.enabled = orbitControlsEnabled;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.08,
      0.3,
      0.9,
    );

    composer.addPass(renderPass);
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
      enableEffects,
    );

    const resize = handleResize(container, camera, renderer, composer);

    return () => {
      resize();
      if (controls) controls.dispose();
      disposeVRM(scene, vrmRef.current);
      vrmRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const composer = composerRef.current;

    if (!renderer || !scene || !camera || !isRendering) return;

    const stop = startAnimation(
      renderer,
      scene,
      camera,
      controls,
      composer,
      () => vrmRef.current,
      () => lightsRef.current,
      () => lipSyncStateRef.current,
      () => enableEffects,
    );

    return () => stop();
  }, [isRendering]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !avatarModel || isInactive) {
      if (vrmRef.current) {
        disposeVRM(scene, vrmRef.current);
        vrmRef.current = null;
      }
      return;
    }

    const abortController = new AbortController();
    let disposed = false;

    queueMicrotask(() => {
      if (!disposed) setLoading(true);
    });

    loadVRM(scene, avatarModel, abortController.signal)
      .then((vrm) => {
        if (disposed) {
          disposeVRM(scene, vrm);
          return;
        }

        const previousVRM = vrmRef.current;
        vrmRef.current = vrm;
        disposeVRM(scene, previousVRM);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error loading VRM:", error);
        }
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
      abortController.abort();
    };
  }, [avatarModel, isInactive]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const bloomPass = bloomPassRef.current;
    if (!renderer || !scene) return;

    lightsRef.current = updateThemeVisuals(
      renderer,
      scene,
      isDark,
      enableEffects,
    );

    renderer.toneMappingExposure = isDark ? 1.12 : 0.98;

    if (bloomPass) {
      bloomPass.enabled = enableEffects;

      if (isDark) {
        bloomPass.strength = 0.12;
        bloomPass.radius = 0.6;
        bloomPass.threshold = 0.78;
      } else {
        bloomPass.strength = 0.06;
        bloomPass.radius = 0.25;
        bloomPass.threshold = 0.9;
      }
    }
  }, [isDark, enableEffects]);

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
