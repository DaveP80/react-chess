import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type OutletContext = {
  supabase: SupabaseClient;
  session: Session;
};
export interface User  {
  id?: string | null;
  email?: string;
  username?: string;
  avatarUrl?: string;
  verified?: boolean;
  provider?: string;
  rating?: Record<any,any>
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

    export type MyHomeData = {
      user: {
        id: string;
        email: string | undefined;
      } | {} | null;
      rowData: any; // Replace 'any' with your actual user table type
      provider?: string;
      message?: string;
      error?: any;
      intent?: any;
    };

// Lobby item type
export interface LobbyItem {
  id: number;
  status: string;
  created_at: string;
  timecontrol: string;
  whiteelo: number | null;
  blackelo: number | null;
  username: string;
  is_rated: boolean;
}
