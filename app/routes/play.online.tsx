import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useNavigate,
  useNavigation,
  useRouteLoaderData,
} from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "~/context/globalcontext";
import {
  gamesNewRequestOnUserColor,
  getNewGamePairing,
  handleInsertedNewGame,
  updateActiveUserStatus,
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

  const validTimeControls = [
    "3+0",
    "3+2",
    "5+0",
    "5+3",
    "10+0",
    "10+5",
    "unlimited",
  ];

  if (!validTimeControls.includes(timeControl)) {
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
  const [loading, setIsLoading] = useState(false);
  const [requestAlert, setRequestAlert] = useState<{
    [key: string]: any;
  } | null>(null);
  const navigation = useNavigation();
  //const PlayContext = useContext(GlobalContext);
  const NewGameContext = useContext(GlobalContext);
  const PlayContext = useRouteLoaderData<typeof loader>("root");
  const navigate = useNavigate();
  const supabase = createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { isSingleton: false }
  );
  const supabase2 = createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    { isSingleton: false }
  );

  if (actionData?.go == true) {
    localStorage.setItem(
      "pairing_info",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("pairing_info") || "{}"),
        data: actionData.data,
      })
    );
  }

  useEffect(() => {
    let userId: string | undefined;

    const useSupabase = async () => {
      const { data: authData, error: authError } =
        await supabase2.auth.getUser();
      userId = authData?.user?.id;
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
              const headers = new Headers();
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

    const channel2 = supabase2
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_moves" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            let pairingInfo = localStorage.getItem("pairing_info");
            pairingInfo = pairingInfo ? JSON.parse(pairingInfo) : null;

            if (pairingInfo && pairingInfo?.data && userId) {
              let response = await getNewGamePairing(pairingInfo, supabase2);

              if (response?.go) {
                const update_res = await updateActiveUserStatus(
                  userId,
                  supabase2
                );
                if (update_res && update_res.go) {
                  //PlayContext.setPlayingGame(true);
                  setRequestAlert(response);
                  NewGameContext.setPGNInfo({
                    ...NewGameContext.pgnInfo,
                    routing_id: response.data?.navigateId,
                    newgame_data: response.data?.newgame_data,
                  });
                  localStorage.setItem(
                    "pgnInfo",
                    JSON.stringify({
                      ...NewGameContext.pgnInfo,
                      routing_id: response.data?.navigateId,
                      newgame_data: response.data?.newgame_data,
                    })
                  );
                }
                navigate(`/game/${response?.data?.navigateId}`);
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
      supabase2.removeChannel(channel2);
    };
  }, []);

  useEffect(() => {
    if (navigation.state === "submitting") {
      setIsLoading(true);
    } else if (navigation.state === "idle") {
      setIsLoading(false);
    }

    return () => {
      true;
    };
  }, [navigation]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      {requestAlert ? (
        <div>
          <button
            className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            onMouseOver={() => {
              navigate(`/game/${requestAlert?.data?.navigateId}`);
            }}
          >
            Go To your New Game!
          </button>
        </div>
      ) : (
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">
          Find an Opponent
        </h1>
      )}

      <Form
        method="post"
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-gray-700">
            Time Control
          </legend>
          {[
            { label: "Blitz 3 min", value: "3+0" },
            { label: "Blitz 3+2", value: "3+2" },
            { label: "Blitz 5 min", value: "5+0" },
            { label: "Blitz 5+3", value: "5+3" },
            { label: "Rapid 10 min", value: "10+0" },
            { label: "Rapid 10+5", value: "10+5" },
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
                onChange={() => {
                  localStorage.setItem(
                    "pairing_info",
                    JSON.stringify({
                      ...JSON.parse(
                        localStorage.getItem("pairing_info") || "{}"
                      ),
                      timeControl: option.value,
                    })
                  );
                }}
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
                onChange={() => {
                  localStorage.setItem(
                    "pairing_info",
                    JSON.stringify({
                      ...JSON.parse(
                        localStorage.getItem("pairing_info") || "{}"
                      ),
                      colorPreference: option.value,
                    })
                  );
                }}
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
          disabled={PlayContext?.rowData?.isActive}
        >
          <span
            className={
              loading
                ? `inline-block
        h-4 w-4
        animate-spin
        rounded-full
        border-2
        border-current
        border-t-transparent`
                : ``
            }
          >
            {loading ? "" : "Find Game"}
          </span>
        </button>

        {actionData?.error && (
          <p className="text-sm text-red-600">{actionData.error}</p>
        )}
      </Form>
    </div>
  );
}
