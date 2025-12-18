import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type OutletContext = {
  supabase: SupabaseClient;
  session: Session;
};
export type User = {
  id?: string | number | null;
  email?: string;
} | null;

export type Game = {
    playingGame: boolean;
    setPlayingGame: (args: boolean) => void;
} | undefined;

export type UserContextType =
  | {
      user: User;
      setUser: (user: User) => void;
      clearUser: () => void;
      rowId: number;
      setRowId: (args: number) => void;
    }
  | undefined;