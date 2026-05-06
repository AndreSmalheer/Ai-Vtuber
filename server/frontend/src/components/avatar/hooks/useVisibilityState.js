import { useEffect, useState, useRef } from "react";

export function useVisibilityState() {
  const [isRendering, setIsRendering] = useState(!document.hidden);
  const [isInactive, setIsInactive] = useState(false);

  const timeoutRef = useRef(null);

  useEffect(() => {
    const onChange = () => {
      if (document.hidden) {
        setIsRendering(false);

        timeoutRef.current = setTimeout(() => {
          setIsInactive(true);
        }, 60000);
      } else {
        setIsRendering(true);
        setIsInactive(false);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", onChange);

    return () => {
      document.removeEventListener("visibilitychange", onChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isRendering, isInactive };
}
