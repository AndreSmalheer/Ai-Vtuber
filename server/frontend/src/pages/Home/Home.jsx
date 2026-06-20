import Header from "../../components/header/header";
import Chat from "../../components/chat/chat";
import Input from "../../components/input/input";
import { useState, useCallback } from "react";

function Home({ config, onAudioStateChange }) {
  const [chatmsg, setChatmsg] = useState("");
  const [chatRole, setChatRole] = useState("");
  const [chathidden, setChathidden] = useState(true);
  const [inputmsg, setInputmsg] = useState("");
  const [inputLocked, setInputLocked] = useState(false);
  const [callMode, setCallMode] = useState(false);
  const [callExit, setCallExit] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [activeVoiceState, setActiveVoiceState] = useState({ type: null, analyser: null });

  const handleAudioStateChange = useCallback((state) => {
    if (state.isPlaying && state.analyser) {
      setActiveVoiceState((prev) => {
        if (prev.type === 'ai' && prev.analyser === state.analyser) return prev;
        return { type: 'ai', analyser: state.analyser };
      });
    } else {
      setActiveVoiceState((prev) => {
        if (prev.type === 'ai') return { type: null, analyser: null };
        return prev;
      });
    }

    onAudioStateChange?.(state);
  }, [onAudioStateChange]);

  const setRecordingAnalyser = useCallback((analyser) => {
    if (analyser) {
      setActiveVoiceState((prev) => {
        if (prev.type === 'user' && prev.analyser === analyser) return prev;
        return { type: 'user', analyser };
      });
    } else {
      setActiveVoiceState((prev) => {
        if (prev.type === 'user') return { type: null, analyser: null };
        return prev;
      });
    }
  }, []);

  const toggleCallMode = () => {
    if (callMode) {
      setCallExit(true);

      setTimeout(() => {
        setCallMode(false);
        setCallExit(false);
      }, 100);
    } else {
      setCallMode(true);
    }
  };

  return (
    <div
      className={
        config.stealth_mode ? "home-layout stealth-layout" : "home-layout"
      }
    >
      <Header
        backBtn={false}
        settingsBtn={true}
        callBtn={true}
        toggleCallMode={toggleCallMode}
        callMode={callMode}
        analyser={activeVoiceState.analyser}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        config={config}
      />
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
        onAudioStateChange={handleAudioStateChange}
        callMode={callMode}
        setCallMode={setCallMode}
      />
      <Input
        inputmsg={inputmsg}
        setInputmsg={setInputmsg}
        setChatmsg={setChatmsg}
        chatRole={chatRole}
        setChatRole={setChatRole}
        inputLocked={inputLocked}
        config={config}
        callMode={callMode}
        setCallMode={setCallMode}
        stealthMode={config.stealth_mode}
        callExit={callExit}
        setCallExit={setCallExit}
        setRecordingAnalyser={setRecordingAnalyser}
        onAudioStateChange={handleAudioStateChange}
        isMenuOpen={isMenuOpen}
      />
    </div>
  );
}

export default Home;
