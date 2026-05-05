import Header from "../../components/header/header";
import Chat from "../../components/chat/chat";
import Input from "../../components/input/input";
import { useState } from "react";

function Home({ config, onAudioStateChange }) {
  const [chatmsg, setChatmsg] = useState("");
  const [chatRole, setChatRole] = useState("");
  const [chathidden, setChathidden] = useState(true);
  const [inputmsg, setInputmsg] = useState("");
  const [inputLocked, setInputLocked] = useState(false);

  return (
    <div
      className={
        config.stealth_mode ? "home-layout stealth-layout" : "home-layout"
      }
    >
      <Header backBtn={false} settingsBtn={true} />
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
        onAudioStateChange={onAudioStateChange}
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
