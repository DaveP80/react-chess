import { createContext, useState } from "react";
import { User, UserContextType, Game } from "~/types";

export const GlobalContext = createContext<UserContextType & Game & any>(undefined);

export default function GlobalContextProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User>({  
        id: -1, 
        email: "",
        username: "",
        avatarUrl: ""});
    const [playingGame, setPlayingGame] = useState(false);    
    const clearUser = () => setUser({ id: -1 });
    return (
        <GlobalContext.Provider
            value={{ user, setUser, clearUser, playingGame, setPlayingGame }}
        >
            {children}
        </GlobalContext.Provider>
    );
};