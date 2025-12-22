import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { createSupabaseServerClient } from '~/utils/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/myhome?intent=login&provider=github'
  const headers = new Headers()

  if (code) {
    const {client, headers} = createSupabaseServerClient(request);
    const supabase = client;


    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return redirect('/myhome?intent=login&provider=github', { headers })
    }
  }
  // return the user to an error page with instructions
  return redirect('/auth/error', { headers })
}