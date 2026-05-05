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
  const recognitionRef = useRef(null);

  /* Speech recognition commented out as requested
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      console.warn("Speech recognition requires a secure context (HTTPS).");
    }

    try {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = document.documentElement.lang || "en-US";

      recognitionRef.current.onstart = () => setIsRecording(true);
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = (event) => {
        if (event.error === "not-allowed") {
          alert("Microphone permission denied.");
        } else {
          console.error("Speech recognition error:", event.error);
        }
        setIsRecording(false);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");

        setInputmsg(transcript);

        if (event.results[0].isFinal) {
          setTimeout(() => {
            handleInput(transcript);
          }, 100);
        }
      };
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        alert(
          "Speech recognition is only supported over HTTPS (Secure Context).",
        );
      } else {
        alert("Speech recognition is not supported in this browser.");
      }
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Error starting speech recognition:", err);
      }
    }
  };
  */

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
          /*
          if (isRecording) {
            recognitionRef.current?.stop();
          }
          */
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
        onClick={() => {
          setIsRecording((prev) => !prev);
        }}
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
