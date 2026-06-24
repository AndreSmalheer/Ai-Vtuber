import "./avatar.css";
import { useEffect, useRef, useState } from "react";
import {
  AvatarCharacter,
  AvatarScene,
  startAnimation,
} from "./three/avatarRuntime";

import { useAvatarStateMachine } from "./hooks/useAvatarStateMachine";
import { AvatarState } from "./hooks/avatarState";

export default function Avatar({
  visible = true,
  avatarModel,
  lipSyncState,
  orbitControlsEnabled = true,
  enableEffects = true,
  isDark = false,
  config,
}) {
  const mountRef = useRef(null);

  const sceneRef = useRef(null);
  const characterRef = useRef(new AvatarCharacter());
  const configRef = useRef(config);

  const [loading, setLoading] = useState(Boolean(avatarModel));
  const [loaderVisible, setLoaderVisible] = useState(Boolean(avatarModel));
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState(null);

  const { state, setState, isWindowVisible, visibilityReloadKey } =
    useAvatarStateMachine();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setLoaderVisible(false);
      }, 500);

      return () => clearTimeout(timer);
    }

    setLoaderVisible(true);
  }, [loading]);

  const enableEffectsRef = useRef(enableEffects);
  useEffect(() => {
    enableEffectsRef.current = enableEffects;
  }, [enableEffects]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const lipSyncStateRef = useRef(lipSyncState);
  useEffect(() => {
    lipSyncStateRef.current = lipSyncState;
  }, [lipSyncState]);

  // Update controls when prop changes
  useEffect(() => {
    sceneRef.current?.setOrbitControlsEnabled(orbitControlsEnabled);
  }, [orbitControlsEnabled]);

  // Update visuals when effects or theme changes
  useEffect(() => {
    sceneRef.current?.setVisuals({ isDark, enableEffects });
  }, [enableEffects, isDark]);

  // ----------------------------
  // INIT THREE SCENE (RUN ONCE)
  // ----------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;

    try {
      sceneRef.current = new AvatarScene(container, {
        orbitControlsEnabled,
        enableEffects,
        isDark,
      });
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSceneReady(true);
          setSceneError(null);
        }
      });
    } catch (err) {
      console.error("Avatar scene error:", err);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSceneReady(false);
          setLoading(false);
          setSceneError(
            "3D avatar is unavailable because this browser could not start WebGL.",
          );
        }
      });
      return;
    }

    const character = characterRef.current;

    return () => {
      cancelled = true;
      character.dispose(sceneRef.current?.scene);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setSceneReady(false);
    };
  }, []);

  // ----------------------------
  // VRM LOADER (STATE DRIVEN)
  // ----------------------------
  useEffect(() => {
    const avatarScene = sceneRef.current;
    const character = characterRef.current;
    if (!sceneReady || !avatarScene) return;

    if (!isWindowVisible || !visible) {
      return;
    }

    if (!avatarModel) {
      character.dispose(avatarScene.scene);
      return;
    }

    setState(AvatarState.LOADING);

    const controller = new AbortController();
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
      }
    });

    character
      .load(avatarScene.scene, avatarModel, controller.signal)
      .then(() => {
        if (!cancelled) {
          setState(AvatarState.ACTIVE);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("VRM load error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [avatarModel, isWindowVisible, sceneReady, visibilityReloadKey, visible]);

  useEffect(() => {
    if (!visible) {
      setState(AvatarState.DISPOSING);
    }
  }, [visible, setState]);

  useEffect(() => {
    const avatarScene = sceneRef.current;
    const character = characterRef.current;
    if (!sceneReady || !avatarScene) return;

    if (state === AvatarState.DISPOSING) {
      character.dispose(avatarScene.scene);
      setState(AvatarState.IDLE);
      Promise.resolve().then(() => setLoading(false));
    }
  }, [sceneReady, state]);

  // ----------------------------
  // ANIMATION LOOP
  // ----------------------------
  useEffect(() => {
    const avatarScene = sceneRef.current;
    const character = characterRef.current;
    if (!avatarScene) return;
    if (!isWindowVisible) return;
    if (state !== AvatarState.ACTIVE) return;

    const stop = startAnimation(
      avatarScene,
      character,
      () => lipSyncStateRef.current,
      () => enableEffectsRef.current,
      () => configRef.current,
    );

    return () => stop?.();
  }, [isWindowVisible, state]);

  return (
    <div
      className={`three-js-container ${visible ? "" : "three-js-container--hidden"}`}
      ref={mountRef}
    >
      <div className={`avatar-loader ${loading ? "" : "avatar-loader--hide"}`}>
        <div className="avatar-loader__ring" />
      </div>
      {sceneError && <div className="avatar-error">{sceneError}</div>}
    </div>
  );
}
