// app/utils/supabase.client.ts
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient(flag: boolean) {
  if (typeof window === "undefined") {
    throw new Error("supabase browser client can only be used in the browser");
  }
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {isSingleton: flag});
  }
  
  return client;
}
