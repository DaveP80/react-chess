import { ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigate } from "@remix-run/react";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { useEffect, useState } from "react";

export const action = async ({ request }: ActionFunctionArgs) => {
    const formData = await request.formData()
    const email = String(formData.get('email'))
    const password = String(formData.get('password'))
    const headers = new Headers()

    // Initialize Supabase client with cookie handling
    const supabase = createServerClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
        {
            cookies: {
                getAll() {
                    return parseCookieHeader(request.headers.get('Cookie') ?? '')
                },
                setAll(key, value, options) {
                    headers.append('Set-Cookie', serializeCookieHeader(key, value, options))
                },
            },
        }
    )
    if (formData.get("intent") == "signup") {

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${new URL(request.url).origin}/auth/confirm`,
            },
        })

        if (error) {
            return Response.json({ error: error.message, message: null }, { headers })
        }
        return Response.json(
            { error: null, message: 'Confirmation email sent.', go: true },
            { headers }
        );

    }
    if (formData.get("intent") == "login") {

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            return Response.json({ error: error.message, message: null }, { headers })
        }
        return Response.json(
            { error: null, message: 'Login Successful.', go: true },
            { headers }
        )

    }
    return Response.json(
        { error: null, message: 'No FormData Actions.' },
        { headers }
    )

}

export default function Index() {

    const Data = useActionData<typeof action>();
    const Gomessage = Data?.go;
    const error = Data?.error;

    const [loading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (Gomessage) {
            setIsLoading(false);
            navigate("/myhome");
        }

        return () => {
            true
        }
    }, [Gomessage])


    return (<div> {loading ? (<div>...Loading</div>) : <></>} </div>)
}