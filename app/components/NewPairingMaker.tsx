import {
  Form,
  useActionData,
  useNavigate,
  useRouteLoaderData,
} from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import { Plus, CircleEllipsis } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNewGamePairingWithPolling,
  handleInsertedNewGame,
  updateActiveUserStatus,
} from "~/utils/game.client";
import { timeAndColorPreferenceReducer } from "~/utils/helper";
// Constants for countdown
const COUNTDOWN_SECONDS = 30;

export default function NewPairingMaker({
  timeControl,
  isRated,
  colorPreference,
}) {
  const actionData = useActionData();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isSearching, setIsSearching] = useState(false);
  const PlayContext = useRouteLoaderData("root");

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createBrowserClient(
    PlayContext?.VITE_SUPABASE_URL,
    PlayContext?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    { isSingleton: false },
  );
  const supabase2 = createBrowserClient(
    PlayContext?.VITE_SUPABASE_URL,
    PlayContext?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    { isSingleton: false },
  );
  const supabase3 = createBrowserClient(
    PlayContext?.VITE_SUPABASE_URL,
    PlayContext?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  );

  // Clear countdown timer
  const clearCountdownTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Start the countdown timer
  const startCountdownTimer = useCallback(() => {
    clearCountdownTimer();
    setCountdown(COUNTDOWN_SECONDS);

    // Start countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished - clear interval and set expired flag
          clearCountdownTimer();
          setIsSearching(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1050);
  }, [clearCountdownTimer]);

  useEffect(() => {
    const userId = PlayContext?.user?.id;

    const channel = supabase
      .channel("realtime-messages-games")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        async (payload: { eventType: string }) => {
          if (payload.eventType === "INSERT") {
            const [colorPreference, timeControl] =
              timeAndColorPreferenceReducer(actionData?.data[0] || {});
            if (userId && colorPreference && timeControl) {
              await handleInsertedNewGame(
                supabase3,
                userId,
                colorPreference,
                timeControl,
                actionData?.data[0].created_at,
                actionData?.data[0].is_rated,
              );
            }
          }
        },
      )
      .subscribe();

    const channel2 = supabase2
      .channel("realtime-messages-game-moves")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_moves" },
        async (payload: { eventType: string }) => {
          if (payload.eventType === "INSERT") {
            if (actionData?.data && userId) {
              //make sure game_moves and game_number_id is synced.
              let response = await getNewGamePairingWithPolling(
                actionData.data[0],
                payload,
                supabase3,
              );

              if (response?.go) {
                // Game found! Clear timer and stop searching
                clearCountdownTimer();
                const update_res = await updateActiveUserStatus(
                  userId,
                  supabase3,
                );
                setIsSearching(false);
                if (update_res && update_res.go) {
                  localStorage.setItem(
                    "pgnInfo",
                    JSON.stringify({
                      routing_id: response.data?.navigateId,
                    }),
                  );
                };
                window.location.href = `/game/${response?.data?.navigateId}`;
              } else {
                setIsSearching(false);
                clearCountdownTimer();
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase2.removeChannel(channel2);
    };
  }, [actionData]);

  // Handle successful form submission - start searching and countdown timer
  useEffect(() => {
    if (actionData?.go == true) {
      setIsSearching(true);
      startCountdownTimer();
    }
    return () => {
      false;
    };
  }, [actionData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearCountdownTimer();
    };
  }, [clearCountdownTimer]);

  const isDisabled = isSearching;

  return (
    <div className="">
      {/* Send search for new random pairing on similar time controls. */}
      <Form method="post">
        <input name="timeControl" value={timeControl} hidden readOnly />
        <input name="colorPreference" value={colorPreference} hidden readOnly />
        <input
          hidden
          name="isRated"
          value={isRated ? "true" : "false"}
          readOnly
        />
        <input hidden name="isPairingMaker" value="true" readOnly />
        <div className="relative group">
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 
                           text-sm font-semibold text-white shadow-sm transition-all
                           focus:outline-none focus:ring-2 focus:ring-amber-500/40
                           ${
                             isDisabled
                               ? "bg-slate-600 cursor-not-allowed opacity-60"
                               : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98]"
                           }`}
          >
            {isDisabled ? <CircleEllipsis size={16} /> : <Plus size={16} />}
          </button>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                           text-xs font-medium text-white bg-slate-900 rounded shadow-lg
                           opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                           transition-all duration-200 delay-150
                           pointer-events-none whitespace-nowrap z-10">
            Find a new opponent
          </span>
        </div>
      </Form>
    </div>
  );
}
