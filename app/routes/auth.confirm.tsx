import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'

export async function loader({ request }: LoaderFunctionArgs) {
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as EmailOtpType | null
    const next = '/myhome'
    const headers = new Headers()

    if (token_hash && type) {
        const supabase = createServerClient(
            import.meta.env.VITE_SUPABASE_URL!,
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
            {
                auth: {
                    flowType: "pkce"
                },
                cookies: {
                    getAll() {
                        return parseCookieHeader(request.headers.get('Cookie') ?? '')
                    },
                    setAll(cookiesToSet) {
                        // collect Set-Cookie header strings for the framework to attach to the response
                        cookiesToSet.forEach(({ name, value, options }) => {
                            headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
                        });
                    },
                },
            }
        )

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            return redirect(next, { headers })
        }
        if (error) {
            console.error('OTP verification error:', error)
            return redirect('/auth/error', { headers })
        }
    }

    // return the user to an error page with instructions
    else {
        console.error("invalid email confirmation URL")

        return redirect('/auth/error', { headers })
    }
}