import { useState, useEffect, useRef } from "react";

export function useVoiceAnimation(analyser) {
  const [volume, setVolume] = useState(0);
  const animationRef = useRef();

  useEffect(() => {
    if (!analyser) {
      setVolume(0);
      return;
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const updateVolume = () => {
      analyser.getByteFrequencyData(frequencyData);

      let sum = 0;
      for (let i = 0; i < frequencyData.length; i++) {
        sum += frequencyData[i];
      }

      const avg = sum / frequencyData.length;

      setVolume(Math.min(avg / 129, 1));

      animationRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyser]);

  return volume;
}
