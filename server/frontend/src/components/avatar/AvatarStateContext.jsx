import { createContext, useContext, useState } from "react";
import { CharacterState } from "./three/avatarRuntime";

const AvatarStateContext = createContext(null);

export function AvatarStateProvider({ children }) {
  const [characterState, setCharacterState] = useState(CharacterState.IDLE);

  return (
    <AvatarStateContext.Provider
      value={{
        characterState,
        setCharacterState,
      }}
    >
      {children}
    </AvatarStateContext.Provider>
  );
}

export function useCharacterState() {
  return useContext(AvatarStateContext);
}
