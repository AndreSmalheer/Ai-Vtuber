import Header from "../../components/header/header";
import Chat from "../../components/chat/chat";
import Input from "../../components/input/input";
import Avatar from "../../components/avatar/avatar";
import { useState, useEffect } from "react";

function Home() {
  const [chatmsg, setChatmsg] = useState("");
  const [chatRole, setChatRole] = useState("");
  const [chathidden, setChathidden] = useState(true);
  const [inputmsg, setInputmsg] = useState("");
  const [inputLocked, setInputLocked] = useState(false);
  const [config, setConfig] = useState({
    stealth_mode: false,
    user_name: "You",
    ai_name: "AI"
  });

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
      })
      .catch((err) => console.error("Error fetching config:", err));
  }, []);

  return (
    <div className={config.stealth_mode ? "stealth-layout" : ""}>
      <Header backBtn={false} settingsBtn={true} />
      {!config.stealth_mode && <Avatar inputLocked={inputLocked}/>}
      <Chat
        chatmsg={chatmsg}
        chathidden={chathidden}
        setChathidden={setChathidden}
        chatRole={chatRole}
        setChatRole={setChatRole}
        setChatmsg={setChatmsg}
        inputLocked={inputLocked}
        setInputLocked={setInputLocked}
        stealthMode={config.stealth_mode}
        userName={config.user_name}
        aiName={config.ai_name}
      />
      <Input
        inputmsg={inputmsg}
        setInputmsg={setInputmsg}
        setChatmsg={setChatmsg}
        chatRole={chatRole}
        setChatRole={setChatRole}
        inputLocked={inputLocked}
      />
    </div>
  );
}

export default Home;
