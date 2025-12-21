import { ActionFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigate } from "@remix-run/react";
import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/context/globalcontext";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const username = String(formData.get("username"));
  const headers = new Headers();

  // Initialize Supabase client with cookie handling
  const supabase = createServerClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
            // collect Set-Cookie header strings for the framework to attach to the response
            cookiesToSet.forEach(({ name, value, options }) => {
                headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
            });
        },
      },
    }
  );
  if (formData.get("intent") == "signup") {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    //   options: {
    //     emailRedirectTo: `${new URL(request.url).origin}/auth/confirm`,
    //   },
    });

    if (error) {
      return Response.json(
        { error: error.message, message: null },
        { headers }
      );
    }
    return Response.json(
      {
        error: null,
        message: "A new user is created and confirmed.",
        go: true,
        intent: "signup",
        id: data?.user?.id,
        username: username,
        verified: false,
        email,
      },
      { headers }
    );
  }
  if (formData.get("intent") == "login") {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return Response.json(
        { error: error.message, message: null },
        { headers }
      );
    }
    return Response.json(
      {
        error: null,
        message: "Login Successful.",
        go: true,
        intent: "login",
        username,
        verified: true,
        email,
      },
      { headers }
    );
  }
  return Response.json(
    { error: null, message: "No FormData Actions." },
    { headers }
  );
};

export default function Index() {
  const Data = useActionData<typeof action>();
  const Gomessage = Data?.go;
  const verified = Data?.verified;
  const intent = Data?.intent;
  const username = Data?.username || "";
  const email = Data?.email || "";

  const [loading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const UserContext = useContext(GlobalContext);

  useEffect(() => {
    if (Gomessage) {
      setIsLoading(false);
      if (intent === "signup" && !verified) {
        localStorage.setItem("auth", JSON.stringify({ new_signup: true }));
      } else {
        localStorage.setItem("auth", JSON.stringify({ new_signup: false }));
      }
      UserContext.setUser({ ...UserContext.user, email, username });
      navigate(
        `/myhome?verified=${verified}&intent=${intent}&username=${username}`
      );
    }

    return () => {
      true;
    };
  }, [Gomessage]);

  return <div> {loading ? <div>...Loading</div> : <></>} </div>;
}
