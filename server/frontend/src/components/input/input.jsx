import { useEffect, useRef, useState } from "react";
import "./input.css";
import { useVoiceAnimation } from "../../hooks/useVoiceAnimation";
import { useCallMode } from "../../hooks/useCallMode";
import { useCharacterState } from "../avatar/AvatarStateContext";
import { CharacterState } from "../avatar/three/avatarRuntime";

const SILENCE_THRESHOLD = 0.01;

function Input({
  inputmsg,
  setInputmsg,
  setChatmsg,
  chatRole,
  setChatRole,
  inputLocked,
  config = {},
  callMode,
  setCallMode,
  stealthMode,
  callExit,
  setCallExit,
  setRecordingAnalyser,
  onAudioStateChange,
  isMenuOpen,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const stableHeightRef = useRef(window.innerHeight);
  const inputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [localMicError, setLocalMicError] = useState(null);

  const { characterState, setCharacterState } = useCharacterState();

  // ── Regular (non-call-mode) mic volume animation ─────────────────────
  const analyserRef = useRef(null);
  const userVolume = useVoiceAnimation(
    isRecording ? analyserRef.current : null,
  );
  const [aiVolume, setAiVolume] = useState(0);

  // ── Call mode — full voice conversation loop ──────────────────────────
  const {
    phase: callPhase,
    userVolume: callUserVolume,
    aiVolume: callAiVolume,
    micError: callMicError,
    sttError,
    ollamaError,
    piperError,
  } = useCallMode({
    active: callMode,
    config,
    onAudioStateChange,
    setRecordingAnalyser,
  });

  // Exit call mode on error
  useEffect(() => {
    if (callMicError || sttError || ollamaError || piperError) {
      setCallMode(false);
    }
  }, [callMicError, sttError, ollamaError, piperError, setCallMode]);

  // Listen for AI volume dispatched by chat.jsx (non-call-mode TTS)
  useEffect(() => {
    const handle = (e) => setAiVolume(e.detail);
    window.addEventListener("ai-volume-change", handle);
    return () => window.removeEventListener("ai-volume-change", handle);
  }, []);

  // Volume used to scale the orb / header button
  const totalVolume = Math.max(userVolume, aiVolume);
  const callScaleVolume =
    callPhase === "speaking" ? callAiVolume : callUserVolume;

  // ── Inactive state logic ──────────────────────────────────────────────
  const isInactive =
    !isFocused && !inputmsg && !isRecording && !callMode && !inputLocked;

  // ── Keyboard / viewport handling ──────────────────────────────────────
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportChange = () => {
      const heightDifference = stableHeightRef.current - viewport.height;
      setKeyboardVisible(heightDifference > 150);
      const keyboardOffset = Math.max(0, heightDifference - viewport.offsetTop);
      document.documentElement.style.setProperty(
        "--keyboard-offset",
        `${keyboardOffset}px`,
      );
    };

    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);
    handleViewportChange();

    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    let targetState = CharacterState.IDLE;

    if (callMode) {
      if (callPhase === "listening") {
        targetState = CharacterState.LISTENING;
      } else if (callPhase === "thinking") {
        targetState = CharacterState.THINKING;
      } else if (callPhase === "speaking") {
        targetState = CharacterState.TALKING;
      } else {
        targetState = isFocused ? CharacterState.LISTENING : CharacterState.IDLE;
      }
    } else if (isRecording) {
      targetState = CharacterState.LISTENING;
    } else if (inputLocked) {
      targetState = CharacterState.THINKING;
    } else if (isFocused) {
      targetState = CharacterState.LISTENING;
    }

    setCharacterState(targetState);
  }, [isFocused, isRecording, callMode, callPhase, inputLocked, setCharacterState]);

  // Handle keyboard/viewport offset layout
  useEffect(() => {
    if (!isFocused) {
      document.documentElement.style.setProperty("--keyboard-offset", "0px");
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardOffset = () => {
      const keyboardOffset = Math.max(
        0,
        stableHeightRef.current - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        "--keyboard-offset",
        `${keyboardOffset}px`,
      );
    };

    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    viewport.addEventListener("scroll", updateKeyboardOffset);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      viewport.removeEventListener("scroll", updateKeyboardOffset);
      document.documentElement.style.setProperty("--keyboard-offset", "0px");
    };
  }, [isFocused]);

  // ── Text chat ─────────────────────────────────────────────────────────
  function handleInput(msg) {
    const messageToSend = typeof msg === "string" ? msg : inputmsg;
    if (messageToSend.trim().length === 0) return;
    setChatmsg(messageToSend);
    setInputmsg("");
    setChatRole("user");
    setIsFocused(false);
  }

  // ── Regular mic (text-mode) ───────────────────────────────────────────
  async function handleMicClick() {
    if (inputLocked || callMode) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    setLocalMicError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setLocalMicError("Microphone access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      setLocalMicError(null);

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      setRecordingAnalyser(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function checkSilence() {
        if (config.auto_silence_detection === false) return;

        analyser.getByteTimeDomainData(dataArray);
        const rms = Math.sqrt(
          dataArray.reduce(
            (sum, val) => sum + Math.pow((val - 128) / 128, 2),
            0,
          ) / dataArray.length,
        );

        if (rms < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              stopRecording();
            }, config.silence_delay_ms ?? 2000);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }

        if (mediaRecorderRef.current?.state === "recording") {
          requestAnimationFrame(checkSilence);
        }
      }

      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : {},
      );
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const response = await fetch("/transcribe", {
            method: "POST",
            body: formData,
          });
          const { text } = await response.json();
          if (text) {
            setInputmsg(text);
            if (config.auto_send_on_mic_stop === false) return;
            handleInput(text);
          }
        } catch (err) {
          console.error("Transcription failed:", err);
        }

        setRecordingAnalyser(null);
        stream.getTracks().forEach((track) => track.stop());
        audioContextRef.current?.close();
        audioContextRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      requestAnimationFrame(checkSilence);
    } catch (err) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setMicPermission("denied");
        setLocalMicError(
          "Microphone permission denied. Please chek your browser permiss",
        );
      } else {
        console.error("Microphone error:", err);
        setLocalMicError("Could not access the microphone.");
      }
      setTimeout(() => setLocalMicError(null), 6000);
    }
  }

  function stopRecording() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function handleStop() {
    window.dispatchEvent(new CustomEvent("ai-stop-generation"));
  }

  function focusWithoutScroll() {
    if (!inputRef.current || inputLocked) return;
    inputRef.current.focus({ preventScroll: true });
    const cursorPosition = inputRef.current.value.length;
    inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    setIsFocused(true);
  }

  function handleTouchStart(event) {
    event.preventDefault();
    focusWithoutScroll();
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={`call-background ${callMode && stealthMode ? "active" : ""}`}
      />

      {(callMicError ||
        localMicError ||
        sttError ||
        ollamaError ||
        piperError) && (
        <div
          className={`call-error-message ${
            callMode && stealthMode ? "call-error-message--fullscreen" : ""
          }`}
        >
          <svg viewBox="0 0 24 24" className="error-icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {callMicError ||
            localMicError ||
            sttError ||
            ollamaError ||
            piperError}
        </div>
      )}

      <div
        className={[
          "input-container",
          isInactive ? "inactive" : "",
          callMode && stealthMode ? "call-mode-fullscreen" : "",
          callMode && !stealthMode ? "call-mode" : "",
          callExit && stealthMode ? "call-mode-exit" : "",
          callMode ? `phase-${callPhase}` : "",
          inputLocked ? "disabled is-circle" : "",
          isFocused ? "focused" : "",
          keyboardVisible ? "keyboard-visible" : "",
          isMenuOpen ? "menu-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => isInactive && focusWithoutScroll()}
        style={
          callMode
            ? {
                "--orb-scale": 1 + callScaleVolume * 0.18,
              }
            : {}
        }
      >
        {/* ── Call mode orb content ─────────────────────────────────── */}
        <div className="call-orb-content" aria-hidden="true">
          {callPhase === "thinking" ? (
            <div className="call-thinking-dots">
              <span />
              <span />
              <span />
            </div>
          ) : callPhase === "speaking" ? (
            <svg className="call-orb-icon" viewBox="0 0 24 24">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          ) : (
            /* listening or idle */
            <svg className="call-orb-icon" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M19 12a7 7 0 0 1-14 0" />
              <path d="M12 19v3" />
            </svg>
          )}
        </div>

        {/* ── Regular text input ────────────────────────────────────── */}
        <div className="input-inner">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message here..."
            value={inputmsg}
            onChange={(e) => setInputmsg(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleInput()}
            onTouchStart={handleTouchStart}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={inputLocked}
          />

          <div
            className={`action-btn-wrapper ${
              inputmsg.trim().length > 0 ? "has-text" : ""
            }`}
          >
            <button
              type="button"
              className={`mic-btn ${isRecording ? "recording" : ""}`}
              disabled={inputLocked || callMode}
              onClick={handleMicClick}
              aria-label="Voice input"
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                <path d="M19 12a7 7 0 0 1-14 0" />
                <path d="M12 19v3" />
                <path d="M8 22h8" />
              </svg>
              <span className="recording-dot"></span>
            </button>

            <button
              className={inputLocked ? "pause-btn" : "send-btn"}
              onClick={inputLocked ? handleStop : handleInput}
              aria-label="Send"
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default Input;
