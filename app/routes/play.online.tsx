import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, Outlet, useActionData, useFetcher, useNavigate } from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/context/globalcontext";
import {
  gamesNewRequestOnUserColor,
  getNewGamePairing,
  handleInsertedNewGame,
} from "~/utils/game";
import { createSupabaseServerClient } from "~/utils/supabase.server";

/* ---------------- LOADER ---------------- */

export async function loader({ request }: LoaderFunctionArgs) {
  // Ensure user is logged in

  return Response.json({});
}

/* ---------------- ACTION ---------------- */

export async function action({ request }: ActionFunctionArgs) {
  const { client, headers } = createSupabaseServerClient(request);
  const supabase = client;
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const formData = Object.fromEntries(await request.formData());
  if (error) {
    return Response.json({ error, go: false }, { headers });
  }

  if (!userId) {
    return redirect("/login");
  }

  if (userId) {
    //look up pairing games on current user id.
    const response = await gamesNewRequestOnUserColor(
      supabase,
      userId,
      headers,
      String(formData?.colorPreference),
      String(formData?.timeControl)
    );
    return response;
  }
  const timeControl = String(formData.timeControl);

  if (
    timeControl !== "3" &&
    timeControl !== "5" &&
    timeControl !== "10" &&
    timeControl !== "unlimited"
  ) {
    return Response.json({ error: "Invalid time control" }, { status: 400 });
  }

  // TODO:
  // 1. Create matchmaking request OR game
  // 2. Assign opponent
  // 3. Create game row

  return Response.json({});
}

export default function Index() {
  const actionData = useActionData<typeof action>();
  const PlayContext = useContext(GlobalContext);
  const [IsDisabled, setIsDisabled] = useState(false);
  const navigate = useNavigate();
  //const [submit, setSubmit] = useState<Record<string, string>>({colorPreference: "", timeControl: ""});
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
    if (actionData?.go == true) {
      localStorage.setItem("pairing_info", JSON.stringify({...JSON.parse(localStorage.getItem("pairing_info") || "{}"), data: actionData.data}));
    }
    const useSupabase = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      userId = authData?.user?.id;
      data = authData;
      error = authError
      if (PlayContext.isPlaying) {
        setIsDisabled(true);
      }
    };
    useSupabase();

      const channel = supabase
        .channel("realtime-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "games" },
          async(payload) => {
            if (payload.eventType === "INSERT") {
              const saved_pairing_info = localStorage.getItem("pairing_info");
              if (saved_pairing_info && JSON.parse(saved_pairing_info).colorPreference && JSON.parse(saved_pairing_info).timeControl) {
                const fData = JSON.parse(saved_pairing_info);
                  const res = await handleInsertedNewGame(
                  supabase,
                  userId,
                  fData.colorPreference,
                  fData.timeControl,
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

        const channel2 = supabase
        .channel("realtime-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "game_moves" },
          async(payload) => {
            if (payload.eventType === "INSERT") {
              let pairingInfo = localStorage.getItem("pairing_info");
              pairingInfo = pairingInfo ? JSON.parse(pairingInfo) : null;

              if (pairingInfo) {
                const headers2 = new Headers()
                const response = await getNewGamePairing(pairingInfo, supabase, headers2);
                if (response) {
                    navigate("/game/1")
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
        supabase.removeChannel(channel2);
    };
  }, [actionData]);

  const handleSubmit = (e) => {
    const formData = new FormData(e.currentTarget);
    localStorage.setItem("pairing_info", JSON.stringify({timeControl: formData.get("timeControl")?.toString() || "", colorPreference: formData.get("colorPreference")?.toString() || ""}))
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        Find an Opponent
      </h1>

      <Form
        method="post"
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-gray-700">
            Time Control
          </legend>
          {[
            { label: "Blitz 3 min", value: "3" },
            { label: "Blitz 5 min", value: "5" },
            { label: "Rapid 10 min", value: "10" },
            { label: "Unlimited", value: "unlimited" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
            >
              <input
                type="radio"
                name="timeControl"
                value={option.value}
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-800">
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>
        {/* ---- COLOR PREFERENCE ---- */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">
            Color Preference
          </legend>

          {[
            { label: "White", value: "white" },
            { label: "Black", value: "black" },
            { label: "Random", value: "random" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
            >
              <input
                type="radio"
                name="colorPreference"
                value={option.value}
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-800">
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          disabled={IsDisabled}
        >
          Find Game
        </button>

        {actionData?.error && (
          <p className="text-sm text-red-600">{actionData.error}</p>
        )}
      </Form>
    </div>
  );
}
