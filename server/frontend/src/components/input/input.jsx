import { useEffect, useRef, useState } from "react";
import "./input.css";

function Input({
  inputmsg,
  setInputmsg,
  setChatmsg,
  chatRole,
  setChatRole,
  inputLocked,
  setInputLocked,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const stableHeightRef = useRef(window.innerHeight);
  const inputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const setStableAppHeight = () => {
      stableHeightRef.current = window.innerHeight;
      document.documentElement.style.setProperty(
        "--app-height",
        `${stableHeightRef.current}px`,
      );
    };

    setStableAppHeight();

    window.addEventListener("orientationchange", setStableAppHeight);

    return () => {
      window.removeEventListener("orientationchange", setStableAppHeight);
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      document.documentElement.style.setProperty("--keyboard-offset", "0px");
      return;
    }

    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

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

  function handleInput(msg) {
    const messageToSend = typeof msg === "string" ? msg : inputmsg;
    if (messageToSend.trim().length === 0) return;

    setChatmsg(messageToSend);
    setInputmsg("");
    setChatRole("user");
    setIsFocused(false);
  }

  async function handleMicClick() {
    if (inputLocked) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone access is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");

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
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const response = await fetch("http://localhost:8000/transcribe", {
            method: "POST",
            body: formData,
          });
          const { text } = await response.json();
          if (text) setInputmsg(text);
        } catch (err) {
          console.error("Transcription failed:", err);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setMicPermission("denied");
        alert(
          "Microphone permission was denied. Please allow it in your browser settings.",
        );
      } else {
        console.error("Microphone error:", err);
        alert("Could not access the microphone.");
      }
    }
  }

  function focusWithoutScroll() {
    if (!inputRef.current || inputLocked) {
      return;
    }

    inputRef.current.focus({ preventScroll: true });
    const cursorPosition = inputRef.current.value.length;
    inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    setIsFocused(true);
  }

  function handleTouchStart(event) {
    event.preventDefault();
    focusWithoutScroll();
  }

  return (
    <div
      className={`input-container
    ${inputLocked ? "disabled" : ""}
    ${isFocused ? "focused keyboard-visible" : ""}`}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Type your message here..."
        value={inputmsg}
        onChange={(e) => {
          setInputmsg(e.target.value);
        }}
        onKeyPress={(e) => e.key === "Enter" && handleInput()}
        onTouchStart={handleTouchStart}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={inputLocked}
      />
      <button
        type="button"
        className={`mic-btn ${isRecording ? "recording" : ""}`}
        disabled={inputLocked}
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
        disabled={inputLocked || inputmsg.trim().length === 0}
        className="send-btn"
        onClick={handleInput}
      />
    </div>
  );
}

export default Input;
