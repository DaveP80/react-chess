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
  const [user, setUser] = useState<User>({
    //DB references Id as u_id;
    id: "",
    email: "",
    username: "",
    avatarUrl: "",
    verified: false,
    provider: "",
    rating: {}
  });
  const [playingGame, setPlayingGame] = useState(false);
  const [activeGame, setActiveGame] = useState(new Chess());
  const [fenHistory, setFenHistory] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [pgnInfo, setPGNInfo] = useState({
    date: new Date().toISOString(),
    //game_moves id
    gameid: 0,
    round: 1,
    white: "",
    black: "",
    result: "",
    whiteelo: 1500,
    blackelo: 1500,
  });

  const clearUser = () => setUser({ id: "" });
  return (
    <GlobalContext.Provider
      value={{
        user,
        setUser,
        clearUser,
        playingGame,
        setPlayingGame,
        activeGame,
        setActiveGame,
        fenHistory,
        setFenHistory,
        moveHistory,
        setMoveHistory,
        pgnInfo,
        setPGNInfo
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}
