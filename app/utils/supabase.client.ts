// app/utils/supabase.client.ts
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient(SUPABASE_URL: string, SUPABASE_PUBLISHABLE_KEY: string, flag: boolean) {
  // if (typeof window === "undefined") {
  //   throw new Error("supabase browser client can only be used in the browser");
  // }
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {isSingleton: flag});
  }
  
  return client;
}
