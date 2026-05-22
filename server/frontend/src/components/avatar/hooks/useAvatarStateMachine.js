import { useEffect, useRef, useState } from "react";
import { AvatarState } from "./avatarState";

export function useAvatarStateMachine() {
  const [state, setState] = useState(() =>
    document.hidden ? AvatarState.PAUSED : AvatarState.ACTIVE,
  );
  const [isWindowVisible, setIsWindowVisible] = useState(
    () => !document.hidden,
  );
  const [visibilityReloadKey, setVisibilityReloadKey] = useState(0);
  const wasHiddenRef = useRef(document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHiddenRef.current = true;
        setIsWindowVisible(false);
        setState(AvatarState.DISPOSING);
        return;
      }

      setIsWindowVisible(true);
      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        setVisibilityReloadKey((key) => key + 1);
      }
      setState(AvatarState.ACTIVE);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { state, setState, isWindowVisible, visibilityReloadKey };
}
