import { useEffect, useRef, useState } from "react";
import "./chat.css";

function Chat({
  chatmsg,
  chathidden,
  setChathidden,
  chatRole,
  setChatRole,
  setChatmsg,
  setInputLocked,
}) {
  const isfirstrender = useRef(true);
  const [airesponse, setAiResponse] = useState("");
  const [aiResponseLoading, setAiResponseLoading] = useState(false);
  const streamQueue = useRef("");
  const displayInterval = useRef(null);

  const displayText = chatRole === "ai" ? airesponse : chatmsg;

  async function fetchAiResponse(input) {
    setAiResponseLoading(true);

    // Fetch config for speed
    let speed = 50;
    try {
      const configRes = await fetch("/api/config");
      const configData = await configRes.json();
      speed = parseInt(configData.response_speed) || 0;
    } catch (e) {
      console.error("Error fetching speed config:", e);
    }

    // call api
    const response = await fetch("/api/ollama", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: input }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Start display interval
    if (displayInterval.current) clearInterval(displayInterval.current);
    
    if (speed > 0) {
      displayInterval.current = setInterval(() => {
        if (streamQueue.current.length > 0) {
          const char = streamQueue.current[0];
          streamQueue.current = streamQueue.current.substring(1);
          setAiResponse((prev) => prev + char);
        }
      }, speed);
    }

    //Streaming response
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // Keep the potentially incomplete last chunk

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const jsonStr = line.replace("data: ", "");
            const json = JSON.parse(jsonStr);
            if (json.text) {
              setAiResponseLoading(false);
              if (speed > 0) {
                streamQueue.current += json.text;
              } else {
                setAiResponse((prev) => prev + json.text);
              }
            }
          } catch (e) {
            console.error("Error parsing stream:", e);
          }
        }
      }
    }

    // Wait for queue to empty if using speed
    if (speed > 0) {
      const checkEmpty = setInterval(() => {
        if (streamQueue.current.length === 0) {
          clearInterval(checkEmpty);
          clearInterval(displayInterval.current);
          finishChat();
        }
      }, 100);
    } else {
      finishChat();
    }
  }

  function finishChat() {
    setTimeout(() => {
      setChathidden(true);
      setInputLocked(false);
    }, 1500);
  }

  useEffect(() => {
    if (!chatmsg) return;

    isfirstrender.current = false;
    const message = chatmsg;

    setInputLocked(true);
    setChatRole("user");
    setAiResponse("");
    streamQueue.current = "";
    if (displayInterval.current) clearInterval(displayInterval.current);
    setChathidden(false);

    const fadeOutUser = setTimeout(() => {
      setChathidden(true);
    }, 1500);

    const switchToAI = setTimeout(() => {
      setChatRole("ai");
      setChathidden(false);

      fetchAiResponse(message);
    }, 2000);

    return () => {
      clearTimeout(fadeOutUser);
      clearTimeout(switchToAI);
      if (displayInterval.current) clearInterval(displayInterval.current);
    };
  }, [chatmsg]);

  return (
    <div className="chat-wrapper">
      <div
        className={`chat-container ${
          isfirstrender.current
            ? "hidden"
            : chathidden
              ? "hidden-animation"
              : "show-animation"
        }`}
      >
        <div className="message user-message">
          <h1 className="user-name">{chatRole}</h1>
          <p className={`message-text ${aiResponseLoading ? "loading" : ""}`}>
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Chat;
