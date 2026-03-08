import { createContext, useCallback, useState } from "react";
import { UserContextType, Game } from "~/types";

export const GlobalContext = createContext<UserContextType & Game & any>(
  undefined
);

export default function GlobalContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [memberRequest, setMemberRequest] = useState<Record<string, any>>({});
  const [memberRequestForm, setMemberRequestForm] = useState<Record<string, any>>({});
  const [memberRequestLock, setMemberRequestLock] = useState(false);
  const [rematchTimeoutStarted, setRematchTimeoutStarted] = useState(false);

  const resetContext = useCallback(() => {
    setMemberRequest({});
    setMemberRequestForm({});
    setMemberRequestLock(false);
    setRematchTimeoutStarted(false);
  }, []);
  
  return (
    <GlobalContext.Provider
      value={{
        memberRequest,
        setMemberRequest,
        memberRequestForm,
        setMemberRequestForm,
        memberRequestLock,
        setMemberRequestLock,
        rematchTimeoutStarted,
        setRematchTimeoutStarted,
        resetContext
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
