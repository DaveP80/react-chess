import {
  Link,
  Links,
  useLoaderData,
  useRevalidator
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { createClient } from "~/utils/supabase.server";
import { getOrCreateSessionId } from "~/utils/auth.server";
import "./tailwind.css"
import MyHome from "~/components/MyHome";
import { createBrowserClient } from "@supabase/ssr";

export const loader = async ({ request }: any) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_PUBLIC_KEY: process.env.SUPABASE_PUBLISHABLE_KEY!,
  };

  const response = new Response();

  const supabase = createBrowserClient(    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { sessionId, getHeaders } = await getOrCreateSessionId(request);
  console.log(sessionId)
  return Response.json({ env, session }, {
    headers: {
      "Set-Cookie": await getHeaders(),
    },
  });
};

export default function App() {
  const { env, session } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const [supabase] = useState(() =>
    createBrowserClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  );
  const serverAccessToken = session?.access_token;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session?.access_token !== serverAccessToken) {
        revalidate();
      }
    });
    if (session?.user) {
      const inputStor = localStorage.getItem(`${session.user.id}`);
      if (inputStor === null) {
        localStorage.setItem(`${session.user.id}`, "");
      }
    }
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, serverAccessToken, revalidate]);

  return (
<MyHome context={{ supabase, session }} />
  );
}