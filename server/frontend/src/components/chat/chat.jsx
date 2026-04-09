import { useEffect, useRef } from "react";
import "./chat.css";

function Chat({
  chatmsg,
  chathidden,
  setChathidden,
  chatRole,
  setChatRole,
  setChatmsg,
}) {
  const isfirstrender = useRef(true);
  const aiResponseRef = useRef("Hello! How can I help you?");

  useEffect(() => {
    if (!chatmsg) return;

    isfirstrender.current = false;
    setChatRole("user");
    setChathidden(false);

    const fadeouttimer = setTimeout(() => {
      setChathidden(true);
    }, 2000);

    const aitimer = setTimeout(() => {
      setChatRole("ai");
      setChathidden(false);
    }, 3000);

    const aiHideTimer = setTimeout(() => {
      setChathidden(true);
    }, 5000);

    const resetChatState = () => {
      setChatRole("");
    };

    const resetTimer = setTimeout(() => {
      resetChatState();
    }, 5500);

    return () => {
      clearTimeout(fadeouttimer);
      clearTimeout(aitimer);
      clearTimeout(aiHideTimer);
      clearTimeout(resetTimer);
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
          <p className="message-text">
            {chatRole === "ai" ? aiResponseRef.current : chatmsg}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Chat;
