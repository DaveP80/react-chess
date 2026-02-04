import { Chess } from "chess.js";
import { createContext, useState } from "react";
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
  return (
    <GlobalContext.Provider
      value={{
        memberRequest,
        setMemberRequest,
        memberRequestForm,
        setMemberRequestForm
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
