import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { createSupabaseServerClient } from '~/utils/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  let urlBuilder = '/myhome?intent=login&provider=github'; 
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || urlBuilder;
  const headers = new Headers()

  if (code) {
    const {client, headers} = createSupabaseServerClient(request);
    const supabase = client;


    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return redirect(urlBuilder, { headers })
    }
  }
  // return the user to an error page with instructions
  return redirect('/auth/error', { headers })
}