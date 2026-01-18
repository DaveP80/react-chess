import { Chess } from "chess.js";
import { createContext, useState } from "react";
import { User, UserContextType, Game } from "~/types";

export const GlobalContext = createContext<UserContextType & Game & any>(
  undefined
);

export default function GlobalContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [playingGame, setPlayingGame] = useState(false);
  const [activeGame, setActiveGame] = useState(new Chess());
  const [fenHistory, setFenHistory] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  return (
    <GlobalContext.Provider
      value={{
        playingGame,
        setPlayingGame,
        activeGame,
        setActiveGame,
        fenHistory,
        setFenHistory,
        moveHistory,
        setMoveHistory,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
