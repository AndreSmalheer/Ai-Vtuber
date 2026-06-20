import { useCallback, useEffect, useRef, useState } from "react";

// RMS silence threshold — same as the regular mic input
const SILENCE_THRESHOLD = 0.01;

/**
 * useCallMode — self-contained voice conversation loop.
 *
 * States: "idle" | "listening" | "thinking" | "speaking"
 *
 * Loop:
 *   active=true
 *     → startListening  (mic open, silence detection)
 *     → silence hit     → recorder.stop()
 *     → onstop          → POST /transcribe (thinking state)
 *     → transcript      → POST /api/ollama stream (thinking → speaking)
 *     → audio chunks    → play queue one-by-one
 *     → queue empty     → startListening again
 *   active=false
 *     → full cleanup, back to "idle"
 */
export function useCallMode({
  active,
  config = {},
  onAudioStateChange,
  setRecordingAnalyser,
}) {
  const [phase, setPhase] = useState("idle");
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [micError, setMicError] = useState(null);
  const [sttError, setSttError] = useState(null);
  const [ollamaError, setOllamaError] = useState(null);
  const [piperError, setPiperError] = useState(null);

  // Keep a ref in sync with the prop so closures always see the latest value
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // ── Mic refs ───────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const micContextRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const micAnimRef = useRef(null);

  // ── Playback refs ──────────────────────────────────────────────────────
  const playbackContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const aiAnimRef = useRef(null);

  // ── Fetch abort ────────────────────────────────────────────────────────
  const abortRef = useRef(null);

  // ── Forward refs so the three functions can call each other ───────────
  const startListeningRef = useRef(null);
  const fetchAiRef = useRef(null);
  const playNextRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────

  const stopMicResources = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (micAnimRef.current) {
      cancelAnimationFrame(micAnimRef.current);
      micAnimRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    micContextRef.current?.close().catch(() => {});
    micContextRef.current = null;
    micAnalyserRef.current = null;
    setUserVolume(0);
    setRecordingAnalyser?.(null);
  }, [setRecordingAnalyser]);

  const stopPlaybackResources = useCallback(() => {
    if (aiAnimRef.current) {
      cancelAnimationFrame(aiAnimRef.current);
      aiAnimRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setAiVolume(0);
    onAudioStateChange?.({
      isPlaying: false,
      analyser: null,
      frequencyData: null,
      timeDomainData: null,
    });
  }, [onAudioStateChange]);

  const cleanup = useCallback(() => {
    // Prevent onstop from triggering further actions after exit
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    stopMicResources();
    stopPlaybackResources();
    setMicError(null);
    setSttError(null);
    setOllamaError(null);
    setPiperError(null);
  }, [stopMicResources, stopPlaybackResources]);

  // ── PLAY NEXT AUDIO ────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (!activeRef.current) return;

    // Queue empty → go back to listening
    if (audioQueueRef.current.length === 0) {
      if (aiAnimRef.current) {
        cancelAnimationFrame(aiAnimRef.current);
        aiAnimRef.current = null;
      }
      isPlayingRef.current = false;
      setAiVolume(0);
      onAudioStateChange?.({
        isPlaying: false,
        analyser: null,
        frequencyData: null,
        timeDomainData: null,
      });
      if (activeRef.current) {
        setPhase("listening");
        startListeningRef.current?.();
      }
      return;
    }

    isPlayingRef.current = true;
    const base64 = audioQueueRef.current.shift();
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    currentAudioRef.current = audio;

    audio.onended = () => {
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
        playNextRef.current?.();
      }
    };
    audio.onerror = () => {
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
        setPiperError("Failed to play audio response.");
        playNextRef.current?.();
      }
    };

    const doPlay = async () => {
      try {
        // Reuse the playback AudioContext across turns so we don't
        // need to keep creating MediaElementSource nodes
        if (
          !playbackContextRef.current ||
          playbackContextRef.current.state === "closed"
        ) {
          const AC = window.AudioContext || window.webkitAudioContext;
          playbackContextRef.current = new AC();
        }
        const ctx = playbackContextRef.current;
        if (ctx.state === "suspended") await ctx.resume();

        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.68;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const timeData = new Uint8Array(analyser.fftSize);

        // Notify parent so the VRM avatar can lip-sync
        onAudioStateChange?.({
          isPlaying: true,
          analyser,
          frequencyData: freqData,
          timeDomainData: timeData,
        });

        // Drive the AI volume for the orb scale animation
        const tick = () => {
          if (currentAudioRef.current !== audio) return;
          analyser.getByteFrequencyData(freqData);
          const avg = freqData.reduce((s, v) => s + v, 0) / freqData.length;
          setAiVolume(Math.min(avg / 129, 1));
          aiAnimRef.current = requestAnimationFrame(tick);
        };
        tick();

        await audio.play();
      } catch (err) {
        console.warn("[useCallMode] Audio playback error:", err);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
          playNextRef.current?.();
        }
      }
    };

    doPlay();
  }, [onAudioStateChange]);
  playNextRef.current = playNext;

  // ── FETCH AI RESPONSE ──────────────────────────────────────────────────
  const fetchAi = useCallback(async (transcript) => {
    if (!activeRef.current) return;
    setPhase("thinking");

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    let hasAudio = false;

    try {
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: transcript }),
        signal: ctrl.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!activeRef.current) {
          reader.cancel();
          break;
        }

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.audio) {
              hasAudio = true;
              audioQueueRef.current.push(json.audio);
              // Start playback as soon as the first chunk arrives
              if (!isPlayingRef.current) {
                setPhase("speaking");
                playNextRef.current?.();
              }
            }
          } catch (_) {
            // Ignore JSON parse errors
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("[useCallMode] AI fetch error:", err);
      setOllamaError("Failed to connect to Ollama.");
    }

    // TTS disabled or an error occurred with no audio → skip straight back
    if (!hasAudio && activeRef.current && !isPlayingRef.current) {
      setPhase("listening");
      startListeningRef.current?.();
    }
  }, []);
  fetchAiRef.current = fetchAi;

  // ── START LISTENING ────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!activeRef.current) return;
    setPhase("listening");

    // ── Open the mic ──
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicError(null);
    } catch (err) {
      console.error("[useCallMode] Mic access denied:", err);
      setMicError(
        "Microphone access denied. Please check your browser permissions.",
      );
      setPhase("idle");
      return;
    }

    if (!activeRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    micStreamRef.current = stream;

    // ── Mic audio context (separate from playback context) ──
    const micCtx = new AudioContext();
    micContextRef.current = micCtx;
    const source = micCtx.createMediaStreamSource(stream);
    const analyser = micCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    micAnalyserRef.current = analyser;

    // Pass to parent so the header call-button can animate
    setRecordingAnalyser?.(analyser);

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    // Volume visualisation loop
    const volumeTick = () => {
      if (!micAnalyserRef.current) return;
      micAnalyserRef.current.getByteFrequencyData(freqData);
      const avg = freqData.reduce((s, v) => s + v, 0) / freqData.length;
      setUserVolume(Math.min(avg / 129, 1));
      micAnimRef.current = requestAnimationFrame(volumeTick);
    };
    volumeTick();

    // ── MediaRecorder ──
    const mimeType =
      [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // ── Tear down mic resources for this turn ──
      if (micAnimRef.current) {
        cancelAnimationFrame(micAnimRef.current);
        micAnimRef.current = null;
      }
      stream.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      micContextRef.current?.close().catch(() => {});
      micContextRef.current = null;
      micAnalyserRef.current = null;
      setUserVolume(0);
      setRecordingAnalyser?.(null);

      if (!activeRef.current) return;

      const blob = new Blob(audioChunksRef.current, {
        type: mimeType || "audio/webm",
      });
      audioChunksRef.current = [];

      // Blob too small = background noise / accidental trigger → restart
      if (blob.size < 500) {
        if (activeRef.current) startListeningRef.current?.();
        return;
      }

      setPhase("thinking");

      // ── Transcribe ──
      let transcript = "";
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const res = await fetch("/transcribe", {
          method: "POST",
          body: form,
          signal: ctrl.signal,
        });
        const data = await res.json();
        transcript = (data.text ?? "").trim();
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("[useCallMode] Transcription error:", err);
        setSttError("Failed to connect to transcription service.");
      }

      if (!activeRef.current) return;

      // Nothing heard (silence / noise) → restart immediately
      if (!transcript) {
        setPhase("listening");
        startListeningRef.current?.();
        return;
      }

      // Hand off to the AI
      fetchAiRef.current?.(transcript);
    };

    // ── Silence detection ──
    const silenceTick = () => {
      if (!micAnalyserRef.current || !activeRef.current) return;
      if (mediaRecorderRef.current?.state !== "recording") return;

      micAnalyserRef.current.getByteTimeDomainData(timeData);
      const rms = Math.sqrt(
        timeData.reduce((s, v) => s + ((v - 128) / 128) ** 2, 0) /
          timeData.length
      );

      if (rms < SILENCE_THRESHOLD) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
            }
          }, config.silence_delay_ms ?? 2000);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }

      if (mediaRecorderRef.current?.state === "recording") {
        requestAnimationFrame(silenceTick);
      }
    };

    recorder.start();
    requestAnimationFrame(silenceTick);
  }, [config.silence_delay_ms, setRecordingAnalyser]);
  startListeningRef.current = startListening;

  // ── MAIN EFFECT: start / stop ──────────────────────────────────────────
  useEffect(() => {
    if (active) {
      setMicError(null);
      // Small delay so the orb entrance animation has time to settle
      const t = setTimeout(() => startListeningRef.current?.(), 700);
      return () => clearTimeout(t);
    } else {
      cleanup();
      setPhase("idle");
      setMicError(null);
    }
  }, [active, cleanup]);

  // Cleanup on component unmount
  useEffect(() => cleanup, [cleanup]);

  return { phase, userVolume, aiVolume, micError, sttError, ollamaError, piperError };
}
