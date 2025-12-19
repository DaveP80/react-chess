import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type OutletContext = {
  supabase: SupabaseClient;
  session: Session;
};
export interface User  {
  id?: string | number | null;
  email?: string;
  username?: string;
  avatarUrl?: string;
} ;

export interface Game {
    playingGame: boolean;
    setPlayingGame: (args: boolean) => void;
};

export interface UserContextType {
      user: User;
      setUser: (user: User) => void;
      clearUser: () => void;
      rowId: number;
      setRowId: (args: number) => void;
    };