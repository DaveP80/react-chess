import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

// Create a single supabase client for interacting with your database
export function createSupabaseServerClient(request: Request) {
  const headers = new Headers();
  const supabase = {
    headers,
    client: createServerClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!, {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({
            name,
            value: value ?? '',
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options)),
          );
        },
      },
    }),
  };

  return supabase;
}