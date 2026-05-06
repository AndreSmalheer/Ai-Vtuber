import * as THREE from "three";

export function updateLipSync(
  vrm,
  expressionNames,
  lipSyncState,
  delta,
  time,
  mouthState,
  readAudioShape,
  clamp01,
  smoothValue,
  setExpression,
) {
  const audio = readAudioShape(lipSyncState, time);

  const targetOpen = audio.volume < 0.04 ? 0 : clamp01(audio.volume * 0.58);
  mouthState.openness = smoothValue(mouthState.openness, targetOpen, delta);

  const rounded = clamp01(
    (audio.low * 1.2 - audio.high * 0.25) * mouthState.openness,
  );

  const wide = clamp01(
    (audio.high * 1.1 + audio.mid * 0.45) * mouthState.openness,
  );

  const open = clamp01(mouthState.openness * 1.15 - rounded * 0.2);

  const targets = {
    aa: open * 0.52,
    ih: wide * 0.3,
    ou: rounded * 0.24,
    ee: wide * 0.22,
    oh: rounded * 0.38 + open * 0.08,
  };

  mouthState.aa = smoothValue(mouthState.aa, targets.aa, delta, 22, 16);
  mouthState.ih = smoothValue(mouthState.ih, targets.ih, delta, 18, 14);
  mouthState.ou = smoothValue(mouthState.ou, targets.ou, delta, 18, 14);
  mouthState.ee = smoothValue(mouthState.ee, targets.ee, delta, 18, 14);
  mouthState.oh = smoothValue(mouthState.oh, targets.oh, delta, 18, 14);

  setExpression(vrm, expressionNames, "aa", mouthState.aa);
  setExpression(vrm, expressionNames, "ih", mouthState.ih);
  setExpression(vrm, expressionNames, "ou", mouthState.ou);
  setExpression(vrm, expressionNames, "ee", mouthState.ee);
  setExpression(vrm, expressionNames, "oh", mouthState.oh);

  return audio;
}

export function createAudioReader(clamp01Fn) {
  return (lipSyncState, time) => {
    if (!lipSyncState?.isPlaying) {
      return { volume: 0, low: 0, mid: 0, high: 0, fallback: false };
    }

    const { analyser, frequencyData, timeDomainData } = lipSyncState;

    if (analyser && frequencyData && timeDomainData) {
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeDomainData);

      let rms = 0;
      for (let i = 0; i < timeDomainData.length; i += 1) {
        const sample = (timeDomainData[i] - 128) / 128;
        rms += sample * sample;
      }
      rms = Math.sqrt(rms / timeDomainData.length);

      const bandAverage = (start, end) => {
        let sum = 0;
        const safeEnd = Math.min(end, frequencyData.length);
        for (let i = start; i < safeEnd; i += 1) sum += frequencyData[i];
        return safeEnd > start ? sum / (safeEnd - start) / 255 : 0;
      };

      return {
        volume: clamp01Fn((rms - 0.012) * 9),
        low: bandAverage(1, 8),
        mid: bandAverage(8, 32),
        high: bandAverage(32, 96),
        fallback: false,
      };
    }

    const pulse =
      0.55 + Math.sin(time * 15) * 0.28 + Math.sin(time * 27) * 0.12;

    return {
      volume: clamp01Fn(pulse),
      low: 0.45 + Math.sin(time * 7) * 0.18,
      mid: 0.55 + Math.sin(time * 11) * 0.2,
      high: 0.35 + Math.sin(time * 13) * 0.15,
      fallback: true,
    };
  };
}
