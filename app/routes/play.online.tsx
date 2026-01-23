import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useNavigate,
  useNavigation,
  useRouteLoaderData,
} from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import { useCallback, useEffect, useRef, useState } from "react";
import LobbySection from "~/components/LobbySection";
import { RatedGameSwitch } from "~/components/RatedGameSwitch";
import { LobbyItem } from "~/types";
import {
  gamesNewRequestOnUserColor,
  getNewGamePairing,
  handleInsertedNewGame,
  updateActiveUserStatus,
} from "~/utils/game";
import { SUPABASE_CONFIG, timeAndColorPreferenceReducer } from "~/utils/helper";
import { get_similar_game_requests_lobby } from "~/utils/supabase.gameplay";
import { createSupabaseServerClient } from "~/utils/supabase.server";

/* ---------------- LOADER ---------------- */

export async function loader() {

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

  if (!userId || !String(formData?.colorPreference) || !String(formData?.timeControl)) {
    return redirect("/login");
  }

  if (userId) {
    //look up pairing games on current user id.
    const response = await gamesNewRequestOnUserColor(
      supabase,
      userId,
      headers,
      String(formData?.colorPreference),
      String(formData?.timeControl),
      Boolean(formData?.isRated)
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

  return Response.json({});
}

// Constants for countdown
const COUNTDOWN_SECONDS = 30;

export default function Index() {
  const actionData = useActionData<typeof action>();
  const [loading, setIsLoading] = useState(false);
  const [isRated, setIsRated] = useState(false);
  const [requestAlert, setRequestAlert] = useState<{
    [key: string]: any;
  } | null>(null);
  const [showLobby, setShowLobby] = useState<LobbyItem[]>([]);
  const navigation = useNavigation();
  const PlayContext = useRouteLoaderData<typeof loader>("root");
  const navigate = useNavigate();

  // Refs and state for countdown functionality
  const [isSearching, setIsSearching] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [countdownExpired, setCountdownExpired] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createBrowserClient(SUPABASE_CONFIG[0], SUPABASE_CONFIG[1], SUPABASE_CONFIG[2]);
  const supabase2 = createBrowserClient(SUPABASE_CONFIG[0], SUPABASE_CONFIG[1], SUPABASE_CONFIG[2]);
  const supabase3 = createBrowserClient(SUPABASE_CONFIG[0], SUPABASE_CONFIG[1], SUPABASE_CONFIG[2]);

  // Clear countdown timer
  const clearCountdownTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Cancel search handler
  const handleCancelSearch = useCallback(() => {

    if (actionData?.data[0]) {
      const del_id = actionData.data[0].id;
      async function cancel_outgoing_game_request() {
        try {

          const
            { error } =
              await
                supabase.from(
                  "games"
                ).delete().eq(
                  "id"
                  , del_id);

          if
            (error) {

            console
              .error(error);
          }

        } catch (error) {

        }

      }
      cancel_outgoing_game_request();

    }
    clearCountdownTimer();
    setIsSearching(false);
    setCountdown(COUNTDOWN_SECONDS);
    setCountdownExpired(false);
  }, [clearCountdownTimer, actionData, supabase]);

  // Start the countdown timer
  const startCountdownTimer = useCallback(() => {
    clearCountdownTimer();
    setCountdown(COUNTDOWN_SECONDS);
    setCountdownExpired(false);

    // Start countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished - clear interval and set expired flag
          clearCountdownTimer();
          setCountdownExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1050);
  }, [clearCountdownTimer]);

  // Handle successful form submission - start searching and countdown timer
  useEffect(() => {
    if (actionData?.go == true) {
      setIsSearching(true);
      setCountdownExpired(false);
      startCountdownTimer();

      const getLobbyData = async () => {
        const lobbyData = await get_similar_game_requests_lobby(supabase3, actionData.data[0].is_rated);
        setShowLobby(lobbyData?.data || []);
      }
      getLobbyData();
    }
    return () => {
      false;
    }
  }, [actionData]);


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
        async (payload: { eventType: string; }) => {
          if (payload.eventType === "INSERT") {
            const [colorPreference, timeControl] = timeAndColorPreferenceReducer(actionData?.data[0] || {});
            if (
              userId &&
              colorPreference &&
              timeControl
            ) {
              const headers = new Headers();
              await handleInsertedNewGame(
                supabase,
                userId,
                colorPreference,
                timeControl,
                actionData?.data[0].created_at,
                actionData?.data[0].is_rated,
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
        async (payload: { eventType: string; }) => {
          if (payload.eventType === "INSERT") {

            if (actionData?.data && userId) {
              let response = await getNewGamePairing(actionData, supabase2);

              if (response?.go) {
                // Game found! Clear timer and stop searching
                clearCountdownTimer();
                setIsSearching(false);
                setCountdownExpired(false);
                const update_res = await updateActiveUserStatus(
                  userId,
                  supabase2
                );
                if (update_res && update_res.go) {
                  setRequestAlert(response);
                  localStorage.setItem(
                    "pgnInfo",
                    JSON.stringify({
                      routing_id: response.data?.navigateId,
                    })
                  );
                };
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

    return () => {
      supabase.removeChannel(channel);
      supabase2.removeChannel(channel2);
    };
  }, [actionData]);

  // Handle navigation state changes
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



  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearCountdownTimer();
    };
  }, [clearCountdownTimer]);


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
      {
        !PlayContext?.rowData.username && (
          <section className="mt-2">
            <Link
              to="/settings"
              className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 
               bg-amber-50 p-4 shadow-sm transition-all hover:bg-amber-100 
               hover:border-amber-300 hover:shadow-md group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-amber-800">Confirm your username</p>
                  <p className="text-sm text-amber-600">Set up your profile to start playing games</p>
                </div>
              </div>
              <span className="text-amber-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all">
                →
              </span>
            </Link>
          </section>
        )
      }

      {/* Search Status Banner */}
      {isSearching && !countdownExpired && (
        <section className="mt-4 mb-4">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated searching indicator */}
                <div className="relative">
                  <div className="h-10 w-10 rounded-full border-4 border-indigo-200"></div>
                  <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                </div>
                <div>
                  <p className="font-medium text-indigo-800">Searching for opponent...</p>
                  <p className="text-sm text-indigo-600">
                    Time remaining: <span className="font-mono font-semibold">{countdown}s</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelSearch}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                Cancel
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-1000 ease-linear"
                  style={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Countdown Expired - Prompt to retry */}
      {isSearching && countdownExpired && (
        <section className="mt-4 mb-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Warning indicator */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-800">Search timed out</p>
                  <p className="text-sm text-amber-600">
                    No opponent found. Please try searching again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Form
        method="post"
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <fieldset className="space-y-3" disabled={isSearching && !countdownExpired}>
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
              className={`flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 ${(isSearching && !countdownExpired) ? "opacity-60 cursor-not-allowed" : ""
                }`}
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
        <fieldset className="space-y-3" disabled={isSearching && !countdownExpired}>
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
              className={`flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 ${(isSearching && !countdownExpired) ? "opacity-60 cursor-not-allowed" : ""
                }`}
            >
              <input
                type="radio"
                name="colorPreference"
                value={option.value}
                required
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <input hidden name="isRated" value={isRated ? "true" : "false"}/>
              <span className="text-sm font-medium text-gray-800">
                {option.label}
              </span>
            </label>
          ))}
        </fieldset>
        <RatedGameSwitch
          defaultRated={false}
          disabled={navigation.state === "submitting" || (isSearching && !countdownExpired)}
          isRated={isRated}
          setIsRated={setIsRated}
        />

        <button
          type="submit"
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${(isSearching && !countdownExpired)
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          disabled={PlayContext?.rowData?.isActive || !PlayContext?.rowData.username || (isSearching && !countdownExpired)}
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
            {loading ? "" : (isSearching && !countdownExpired) ? "Searching..." : "Find Game"}
          </span>
        </button>

        {actionData?.error && (
          <p className="text-sm text-red-600">{actionData.error}</p>
        )}
      </Form>

      <LobbySection showLobby={showLobby} />
    </div>
  );
}