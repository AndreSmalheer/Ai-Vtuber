import { useEffect, useRef, useState } from "react";
import "./chat.css";
import { useVoiceAnimation } from "../../hooks/useVoiceAnimation";
import { useCharacterState } from "../avatar/AvatarStateContext";
import { CharacterState } from "../avatar/three/avatarRuntime";

function Chat({
  chatmsg,
  chathidden,
  setChathidden,
  chatRole,
  setChatRole,
  setChatmsg,
  setInputLocked,
  stealthMode,
  userName = "Andre",
  aiName = "Mia",
  onAudioStateChange,
  callMode,
  setCallMode,
}) {
  const { setCharacterState } = useCharacterState();
  const [airesponse, setAiResponse] = useState("");
  const [aiResponseLoading, setAiResponseLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  useEffect(() => {
    errorRef.current = error;
  }, [error]);
  const streamQueue = useRef("");
  const accumulatedResponseRef = useRef("");
  const audioQueue = useRef([]);
  const isAudioPlaying = useRef(false);
  const audioContextRef = useRef(null);
  const currentAudioRef = useRef(null);
  const displayInterval = useRef(null);
  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const aiLoadingRef = useRef(true);
  const streamCompleteRef = useRef(false);
  const audioCompleteRef = useRef(false);
  const revealTextRef = useRef(false);

  const [aiAnalyser, setAiAnalyser] = useState(null);
  const aiVolume = useVoiceAnimation(aiAnalyser);

  const displayText = chatRole === "ai" ? airesponse : chatmsg;

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (displayInterval.current) {
      clearInterval(displayInterval.current);
      displayInterval.current = null;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueue.current = [];
    isAudioPlaying.current = false;
    setAiAnalyser(null);
    onAudioStateChange?.({
      isPlaying: false,
      analyser: null,
      frequencyData: null,
      timeDomainData: null,
    });

    finishChat();
  };

  const clearDisplayInterval = () => {
    if (displayInterval.current) {
      clearInterval(displayInterval.current);
      displayInterval.current = null;
    }
  };

  const startDisplayInterval = (speed, minSpeed = 0) => {
    clearDisplayInterval();

    const intervalSpeed = Math.max(speed, minSpeed);
    if (intervalSpeed <= 0) return;

    displayInterval.current = setInterval(() => {
      if (streamQueue.current.length > 0) {
        const char = streamQueue.current[0];
        streamQueue.current = streamQueue.current.substring(1);
        setAiResponse((prev) => prev + char);
      } else {
        clearDisplayInterval();
      }
    }, intervalSpeed);
  };

  const tryFinishChat = () => {
    if (streamCompleteRef.current && audioCompleteRef.current) {
      finishChat();
    }
  };

  useEffect(() => {
    const handleStop = () => stopGeneration();
    window.addEventListener("ai-stop-generation", handleStop);
    return () => window.removeEventListener("ai-stop-generation", handleStop);
  }, [stealthMode]); // stealthMode is a dependency of finishChat

  useEffect(() => {
    const handleFallbackResponse = (e) => {
      const { text, error } = e.detail;
      setAiResponse(text);
      setError("Piper tts timeout");
      setChatRole("ai");
      setChathidden(false);
      setInputLocked(false);
      setAiResponseLoading(false);
    };
    window.addEventListener(
      "ai-show-fallback-response",
      handleFallbackResponse,
    );
    return () =>
      window.removeEventListener(
        "ai-show-fallback-response",
        handleFallbackResponse,
      );
  }, []);

  const createLipSyncAnalyser = (audio) => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio API is not supported in this browser.");
        }
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.68;

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      return {
        analyser,
        frequencyData: new Uint8Array(analyser.frequencyBinCount),
        timeDomainData: new Uint8Array(analyser.fftSize),
      };
    } catch (err) {
      console.warn("Audio analyser unavailable, using fallback lipsync:", err);
      return null;
    }
  };

  const playNextAudio = () => {
    if (audioQueue.current.length === 0) {
      isAudioPlaying.current = false;
      setAiAnalyser(null);
      onAudioStateChange?.({
        isPlaying: false,
        analyser: null,
        frequencyData: null,
        timeDomainData: null,
      });

      audioCompleteRef.current = true;
      tryFinishChat();
      return;
    }

    if (!isAudioPlaying.current) {
      isAudioPlaying.current = true;
    }

    const base64Audio = audioQueue.current.shift();
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    currentAudioRef.current = audio;

    const resumeAndPlay = async () => {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const lipSyncAnalyser = createLipSyncAnalyser(audio);
      setAiAnalyser(lipSyncAnalyser?.analyser || null);

      onAudioStateChange?.({
        isPlaying: true,
        analyser: lipSyncAnalyser?.analyser || null,
        frequencyData: lipSyncAnalyser?.frequencyData || null,
        timeDomainData: lipSyncAnalyser?.timeDomainData || null,
      });

      audio.play().catch((err) => {
        console.warn("Audio play blocked or failed:", err);
        if (currentAudioRef.current === audio) playNextAudio();
      });
    };

    audio.onended = () => {
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
        playNextAudio();
      }
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
        playNextAudio();
      }
    };

    resumeAndPlay();
  };

  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };

    window.addEventListener("click", initAudioContext, { once: true });
    window.addEventListener("keydown", initAudioContext, { once: true });

    return () => {
      window.removeEventListener("click", initAudioContext);
      window.removeEventListener("keydown", initAudioContext);
    };
  }, []);

  useEffect(() => {
    if (stealthMode) {
      fetch("/api/history")
        .then((res) => res.json())
        .then((data) => {
          setMessages(
            data
              .map((m) => [
                { role: "user", text: m.user },
                { role: "ai", text: m.ai },
              ])
              .flat(),
          );
        });
    }
  }, [stealthMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, airesponse, chatmsg]);

  async function fetchAiResponse(input) {
    setAiResponseLoading(true);
    aiLoadingRef.current = true;
    setError(null);

    streamCompleteRef.current = false;
    audioCompleteRef.current = false;
    revealTextRef.current = false;

    accumulatedResponseRef.current = "";
    streamQueue.current = "";
    clearDisplayInterval();

    abortControllerRef.current = new AbortController();

    let speed = 50;
    let shouldWaitForAudio = false;

    try {
      const configRes = await fetch("/api/config");
      const configData = await configRes.json();

      speed = parseInt(configData.response_speed) || 0;
      setTtsEnabled(configData.tts_enabled);
      shouldWaitForAudio = !!configData.tts_enabled && !stealthMode;
    } catch (e) {
      console.error("Error fetching speed config:", e);
      shouldWaitForAudio = false;
    }

    audioCompleteRef.current = !shouldWaitForAudio;
    revealTextRef.current = !shouldWaitForAudio;

    try {
      const response = await fetch("/api/ollama", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: input,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasStartedStreaming = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        if (!hasStartedStreaming) {
          hasStartedStreaming = true;
          setCharacterState(CharacterState.TALKING);
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const jsonStr = line.replace("data: ", "");
            const json = JSON.parse(jsonStr);

            if (json.error) {
              console.error("Backend error:", json.error);
              setError("Somting went wrong");
              if (
                json.error.toLowerCase().includes("piper") ||
                json.error.toLowerCase().includes("tts")
              ) {
                audioCompleteRef.current = true;
                revealTextRef.current = true;
                aiLoadingRef.current = false;
                setAiResponseLoading(false);
                if (
                  !displayInterval.current &&
                  accumulatedResponseRef.current
                ) {
                  streamQueue.current = accumulatedResponseRef.current;
                  startDisplayInterval(speed, 16);
                }
              } else {
                setAiResponseLoading(false);
                setChathidden(true);
                finishChat();
                return;
              }
            }

            if (json.text) {
              accumulatedResponseRef.current += json.text;

              if (shouldWaitForAudio && !revealTextRef.current) {
                streamQueue.current += json.text;
              } else if (speed > 0) {
                streamQueue.current += json.text;
                if (!displayInterval.current) {
                  startDisplayInterval(speed);
                }
              } else {
                setAiResponse((prev) => prev + json.text);
              }
            }

            if (json.audio) {
              audioQueue.current.push(json.audio);

              if (shouldWaitForAudio && !revealTextRef.current) {
                revealTextRef.current = true;
                aiLoadingRef.current = false;
                setAiResponseLoading(false);

                streamQueue.current = accumulatedResponseRef.current;
                startDisplayInterval(speed, 16);
              } else if (aiLoadingRef.current) {
                aiLoadingRef.current = false;
                setAiResponseLoading(false);
              }

              if (!isAudioPlaying.current) {
                playNextAudio();
              }
            }
          } catch (e) {
            console.error("Error parsing stream:", e);
          }
        }
      }

      streamCompleteRef.current = true;

      if (shouldWaitForAudio && !revealTextRef.current) {
        revealTextRef.current = true;
        aiLoadingRef.current = false;
        setAiResponseLoading(false);

        streamQueue.current = accumulatedResponseRef.current;
        startDisplayInterval(speed, 16);
      }

      if (
        !shouldWaitForAudio &&
        !isAudioPlaying.current &&
        audioQueue.current.length === 0
      ) {
        audioCompleteRef.current = true;
      }

      tryFinishChat();
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("AI response fetch aborted");
      } else {
        console.error("Fetch error:", err);
        setError("Failed to connect to Ollama.");
        setAiResponseLoading(false);
        setChathidden(true);
        finishChat();
      }
    } finally {
      abortControllerRef.current = null;
    }
  }

  function finishChat() {
    if (stealthMode) {
      const finalAiText = accumulatedResponseRef.current;
      if (finalAiText && finalAiText.trim()) {
        setMessages((prev) => [...prev, { role: "ai", text: finalAiText }]);
      }
      setAiResponse("");
      setChatmsg("");
      setChatRole("");
      setInputLocked(false);
      return;
    }
    setTimeout(() => {
      if (!errorRef.current) {
        setChathidden(true);
      }
      setInputLocked(false);
      setChatRole("");
    }, 1500);
  }

  useEffect(() => {
    if (!chatmsg) return;

    const message = chatmsg;

    aiLoadingRef.current = true;
    streamCompleteRef.current = false;
    audioCompleteRef.current = false;
    revealTextRef.current = false;
    clearDisplayInterval();

    setInputLocked(true);
    setChatRole("user");
    setAiResponse("");
    streamQueue.current = "";
    accumulatedResponseRef.current = "";
    if (displayInterval.current) clearInterval(displayInterval.current);
    setChathidden(false);

    if (stealthMode) {
      setMessages((prev) => [...prev, { role: "user", text: message }]);
    }

    const fadeOutUser = setTimeout(() => {
      if (!stealthMode) setChathidden(true);
    }, 1500);

    const switchToAI = setTimeout(
      () => {
        setChatRole("ai");
        setChathidden(false);

        fetchAiResponse(message);
      },
      stealthMode ? 500 : 2000,
    );

    return () => {
      clearTimeout(fadeOutUser);
      clearTimeout(switchToAI);
      if (displayInterval.current) clearInterval(displayInterval.current);
    };
  }, [chatmsg]);

  useEffect(() => {
    const handleTriggerWelcome = async () => {
      setChatRole("ai");
      setChathidden(false);
      setAiResponse("");
      accumulatedResponseRef.current = "";
      streamQueue.current = "";
      if (displayInterval.current) clearInterval(displayInterval.current);

      let welcomePrompt =
        "Give a very short (1 sentence) welcome back greeting to the user who just returned.";
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (data.welcome_message_prompt) {
          welcomePrompt = data.welcome_message_prompt;
        }
      } catch (err) {
        console.error("Error fetching welcome prompt:", err);
      }

      fetchAiResponse(welcomePrompt);
    };

    window.addEventListener("ai-trigger-welcome", handleTriggerWelcome);
    return () => {
      window.removeEventListener("ai-trigger-welcome", handleTriggerWelcome);
    };
  }, [stealthMode, userName, aiName]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("ai-volume-change", { detail: aiVolume }),
    );
  }, [aiVolume]);

  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollBtn(scrollTop < scrollHeight - clientHeight - 100);
      }
    };

    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, [stealthMode]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  if (stealthMode) {
    return (
      <div className="chat-wrapper stealth" ref={scrollRef}>
        {messages.length === 0 && (
          <h1 className="no-messages">Start a conversation with {aiName}</h1>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`stealth-message ${m.role}`}>
            <span className="role">
              {m.role === "user" ? userName : aiName}
            </span>
            <p className="text">{m.text}</p>
          </div>
        ))}

        {(chatRole === "ai" || error) && (
          <div className="stealth-message ai current">
            <span className="role">{aiName}</span>
            {airesponse && (
              <p className={`text ${aiResponseLoading ? "loading" : ""}`}>
                {airesponse}
              </p>
            )}
            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        <button
          className={`scroll-to-bottom-btn ${showScrollBtn ? "visible" : ""}`}
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <svg viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`chat-wrapper ${callMode ? "hidden" : ""}`}>
        {error && <div className="error-message above-chat">{error}</div>}

        <div
          className={`chat-container ${
            !chatmsg && !chatRole && !airesponse && !error
              ? "hidden"
              : chathidden
                ? "hidden-animation"
                : "show-animation"
          }`}
        >
          <div className="message user-message">
            <h1 className="user-name">
              {chatRole === "user" ? userName : aiName}
            </h1>
            {displayText && (
              <p
                className={`message-text ${aiResponseLoading ? "loading" : ""}`}
              >
                {displayText}
              </p>
            )}

            {aiResponseLoading && (
              <span className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Chat;
