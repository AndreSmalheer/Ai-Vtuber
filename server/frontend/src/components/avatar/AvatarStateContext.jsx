import { createContext, useContext, useState } from "react";
import { CharacterState } from "./three/avatarRuntime";

const AvatarStateContext = createContext(null);

export function AvatarStateProvider({ children }) {
  const [characterState, setCharacterState] = useState(CharacterState.IDLE);

  const [mood, setMood] = useState("neutral");

  return (
    <AvatarStateContext.Provider
      value={{
        characterState,
        setCharacterState,

        mood,
        setMood,
      }}
    >
      {children}
    </AvatarStateContext.Provider>
  );
}

export function useCharacterState() {
  return useContext(AvatarStateContext);
}
