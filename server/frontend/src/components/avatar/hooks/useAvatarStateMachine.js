import { useEffect, useRef, useState } from "react";
import { AvatarState } from "./avatarState";

export function useAvatarStateMachine() {
  const [state, setState] = useState(AvatarState.IDLE);
  const unloadTimerRef = useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setState(AvatarState.PAUSED);

        unloadTimerRef.current = setTimeout(() => {
          setState(AvatarState.DISPOSING);
        }, 60000);

        return;
      }

      if (unloadTimerRef.current) {
        clearTimeout(unloadTimerRef.current);
        unloadTimerRef.current = null;
      }

      setState(AvatarState.ACTIVE);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!document.hidden) {
      setState(AvatarState.ACTIVE);
    } else {
      setState(AvatarState.PAUSED);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (unloadTimerRef.current) {
        clearTimeout(unloadTimerRef.current);
      }
    };
  }, []);

  return { state, setState };
}
