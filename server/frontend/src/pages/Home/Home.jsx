import Header from "../../components/header/header";
import Chat from "../../components/chat/chat";
import Input from "../../components/input/input";
import Avatar from "../../components/avatar/avatar";
import { useState } from "react";

function Home() {
  const [chatmsg, setChatmsg] = useState("");
  const [chatRole, setChatRole] = useState("");
  const [chathidden, setChathidden] = useState(true);
  const [inputmsg, setInputmsg] = useState("");
  const [inputLocked, setInputLocked] = useState(false);

  return (
    <>
      <Header backBtn={false} settingsBtn={true} />
      <Avatar inputLocked={inputLocked}/>
      <Chat
        chatmsg={chatmsg}
        chathidden={chathidden}
        setChathidden={setChathidden}
        chatRole={chatRole}
        setChatRole={setChatRole}
        setChatmsg={setChatmsg}
        inputLocked={inputLocked}
        setInputLocked={setInputLocked}
      />
      <Input
        inputmsg={inputmsg}
        setInputmsg={setInputmsg}
        setChatmsg={setChatmsg}
        chatRole={chatRole}
        setChatRole={setChatRole}
        inputLocked={inputLocked}
      />
    </>
  );
}

export default Home;
