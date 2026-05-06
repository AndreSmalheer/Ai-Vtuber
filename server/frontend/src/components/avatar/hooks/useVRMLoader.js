import { useEffect, useRef } from "react";
import { loadVRM, disposeVRM } from "../three/vrmLoader";
import { AvatarState } from "./avatarState";

function ensureVisible(vrm) {
  if (!vrm?.scene) return;

  vrm.scene.visible = true;
  vrm.scene.traverse((obj) => {
    obj.visible = true;
  });
}

export function useVrmLoader({
  scene,
  avatarModel,
  state,
  setState,
  vrmRef,
  setLoading,
}) {
  const lastModelRef = useRef(null);

  useEffect(() => {
    if (!scene) return;

    // ----------------------------
    // DISPOSE STATE
    // ----------------------------
    if (state === AvatarState.DISPOSING) {
      if (vrmRef.current) {
        disposeVRM(scene, vrmRef.current);
        vrmRef.current = null;
      }

      lastModelRef.current = null;
      setState(AvatarState.IDLE);
      return;
    }

    // ----------------------------
    // PAUSED STATE (DO NOTHING)
    // ----------------------------
    if (state === AvatarState.PAUSED) {
      if (vrmRef.current) {
        ensureVisible(vrmRef.current);
      }
      setLoading(false);
      return;
    }

    // ----------------------------
    // NO MODEL
    // ----------------------------
    if (!avatarModel) return;

    // ----------------------------
    // ALREADY LOADED SAME MODEL
    // ----------------------------
    if (vrmRef.current && lastModelRef.current === avatarModel) {
      ensureVisible(vrmRef.current);
      setState(AvatarState.ACTIVE);
      setLoading(false);
      return;
    }

    // ----------------------------
    // LOAD NEW MODEL
    // ----------------------------
    setLoading(true);
    setState(AvatarState.LOADING);

    const controller = new AbortController();
    let cancelled = false;

    loadVRM(scene, avatarModel, controller.signal)
      .then((vrm) => {
        if (cancelled) {
          disposeVRM(scene, vrm);
          return;
        }

        ensureVisible(vrm);

        const old = vrmRef.current;
        vrmRef.current = vrm;
        lastModelRef.current = avatarModel;

        if (old) disposeVRM(scene, old);

        setState(AvatarState.ACTIVE);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("VRM load error:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [scene, avatarModel, state]);
}
