import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useFetcher } from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/context/globalcontext";
import {
  getNewGamePairing,
} from "~/utils/game";

/* ---------------- LOADER ---------------- */

export async function loader({ request }: LoaderFunctionArgs) {
  // Ensure user is logged in

  return Response.json({});
}

/* ---------------- ACTION ---------------- */

export async function action({ request }: ActionFunctionArgs) {


  return Response.json({});
}

export default function Index() {
    const [searching, setSearching] = useState(false)

  const supabase = createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { isSingleton: false }
  );

  useEffect(() => {
    const headers = new Headers();
    let data;
    let error;
    let userId: string | undefined;
    const useSupabase = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      userId = authData?.user?.id;
      data = authData;
      error = authError
    };
    useSupabase();

      const channel = supabase
        .channel("realtime-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "game_moves" },
          async(payload) => {
            if (payload.eventType === "INSERT") {
              let pairingInfo = localStorage.getItem("pairing_info");
              pairingInfo = pairingInfo ? JSON.parse(pairingInfo) : null;

              if (pairingInfo && userId) {
                const response = await getNewGamePairing(pairingInfo, supabase, headers);
                if (response) {
                    setSearching(false);


                }
              }
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
    <div className="div">
        {searching ? (<div>...Pairing</div>) : null}
    </div>

  );
}
