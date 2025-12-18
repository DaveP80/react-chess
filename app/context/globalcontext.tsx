import { createContext, useState } from "react";
import { User, UserContextType, Game } from "~/types";

export const GlobalContext = createContext<(UserContextType & Game) | undefined>(undefined);

export default function GlobalContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User>(null);
    const [playingGame, setPlayingGame] = useState(false);    
    const clearUser = () => setUser({ id: null });
    return (
        <GlobalContext.Provider
            value={{ user, setUser, clearUser, playingGame, setPlayingGame }}
        >
            {children}
        </GlobalContext.Provider>
    );
}