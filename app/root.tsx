import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/styles/tailwind.css?url";
import Navigation from "./components/Navigation";
import GlobalContextProvider from "./context/globalcontext";
import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { handleInsertedNewGame } from "./utils/game";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export function ErrorBoundary() {
  useRouteError();
  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Link to="/">Go to Login and Dashboard</Link>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const supabase = createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { isSingleton: false }
  );

  const navigate = useNavigate();
  useEffect(() => {
    const headers = new Headers();
    let data;
    let error;
    let userId: string | undefined;

    const useSupabase = async () => {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      userId = authData?.user?.id;
      data = authData;
      error = authError;
    };

    useSupabase();


    const channel = supabase
    .channel("realtime-messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      async (payload) => {
        if (payload.eventType === "INSERT") {
          const saved_pairing_info = localStorage.getItem("pairing_info");
          if (
            userId &&
            saved_pairing_info &&
            JSON.parse(saved_pairing_info).colorPreference &&
            JSON.parse(saved_pairing_info).timeControl &&
            JSON.parse(saved_pairing_info).data
          ) {
            const fData = JSON.parse(saved_pairing_info);
              await handleInsertedNewGame(
                supabase,
                userId,
                fData.colorPreference,
                fData.timeControl,
                fData.data[0].created_at,
                headers
              );
            }
          }
          if (payload.eventType === "UPDATE") {
            ("foo");
          }
          if (payload.eventType === "DELETE") {
            ("bar");
          }
        }
      )
      .subscribe();


      
      return async () => {
        supabase.removeChannel(channel);
      };
    }, []);
    
    return (
      <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <GlobalContextProvider>
          <Navigation />
          <Outlet />
        </GlobalContextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
