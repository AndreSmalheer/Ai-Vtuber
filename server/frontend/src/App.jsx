import Header from "./components/header/header";
import Input from "./components/input/input";
import Chat from "./components/chat/chat";
import { useState } from "react";

function App() {
  const [chatmsg, setChatmsg] = useState("");
  const [chatRole, setChatRole] = useState("");
  const [chathidden, setChathidden] = useState(true);
  const [inputmsg, setInputmsg] = useState("");

  return (
    <>
      <Header backBtn={false} settingsBtn={true} />
      <Chat
        chatmsg={chatmsg}
        chathidden={chathidden}
        setChathidden={setChathidden}
        chatRole={chatRole}
        setChatRole={setChatRole}
        setChatmsg={setChatmsg}
      />
      <Input
        inputmsg={inputmsg}
        setInputmsg={setInputmsg}
        setChatmsg={setChatmsg}
        chatRole={chatRole}
        setChatRole={setChatRole}
      />
    </>
  );
}

export default App;
