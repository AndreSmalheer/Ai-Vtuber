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
  stealthMode,
  userName = "You",
  aiName = "AI",
}) {
  const isfirstrender = useRef(true);
  const [airesponse, setAiResponse] = useState("");
  const [aiResponseLoading, setAiResponseLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const streamQueue = useRef("");
  const displayInterval = useRef(null);
  const scrollRef = useRef(null);

  const displayText = chatRole === "ai" ? airesponse : chatmsg;

  useEffect(() => {
    if (stealthMode) {
      fetch("/api/history")
        .then((res) => res.json())
        .then((data) => {
          setMessages(data.map(m => ([
            { role: "user", text: m.user },
            { role: "ai", text: m.ai }
          ])).flat());
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
    if (stealthMode) {
      // In stealth mode, we don't fade out, we just add the message to history list
      setMessages(prev => [...prev, { role: "ai", text: streamQueue.current || airesponse }]);
      setAiResponse("");
      setChatmsg("");
      setInputLocked(false);
      return;
    }
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

    if (stealthMode) {
      setMessages(prev => [...prev, { role: "user", text: message }]);
    }

    const fadeOutUser = setTimeout(() => {
      if (!stealthMode) setChathidden(true);
    }, 1500);

    const switchToAI = setTimeout(() => {
      setChatRole("ai");
      setChathidden(false);

      fetchAiResponse(message);
    }, stealthMode ? 500 : 2000);

    return () => {
      clearTimeout(fadeOutUser);
      clearTimeout(switchToAI);
      if (displayInterval.current) clearInterval(displayInterval.current);
    };
  }, [chatmsg]);

  if (stealthMode) {
    return (
      <div className="chat-wrapper stealth" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`stealth-message ${m.role}`}>
            <span className="role">{m.role === "user" ? userName : aiName}</span>
            <p className="text">{m.text}</p>
          </div>
        ))}
        {chatRole === "user" && chatmsg && (
           <div className="stealth-message user current">
            <span className="role">{userName}</span>
            <p className="text">{chatmsg}</p>
          </div>
        )}
        {chatRole === "ai" && (
           <div className="stealth-message ai current">
            <span className="role">{aiName}</span>
            <p className={`text ${aiResponseLoading ? "loading" : ""}`}>{airesponse}</p>
          </div>
        )}
      </div>
    );
  }

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
