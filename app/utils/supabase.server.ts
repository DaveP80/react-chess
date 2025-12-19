// app/utils/supabase.server.ts
import { createServerClient } from '@supabase/ssr';
import { parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_DEFAULT_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export function createSupabaseServerClient(request: Request) {
  // parse incoming cookies from the request
  const incomingCookies = parseCookieHeader(request.headers.get('Cookie') ?? '');

  // prepare a headers collector so we can return Set-Cookie headers to the caller
  const setCookieHeaders: string[] = [];

  // Build server client. The createServerClient helper expects cookies with getAll/setAll.
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_DEFAULT_KEY, {
    cookies: {
      getAll() {
        return incomingCookies;
      },
      setAll(cookiesToSet) {
        // collect Set-Cookie header strings for the framework to attach to the response
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookieHeaders.push(serializeCookieHeader(name, value, options));
        });
      },
    },
    // Optionally pass a global fetch to ensure the client uses the same fetch as Remix
    // global: { fetch: fetch as any },
  });

  return { supabase, setCookieHeaders };
}