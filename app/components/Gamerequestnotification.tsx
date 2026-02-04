import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import {
  getNewGamePairing,
  getNewMemberGamePairing,
  handleInsertStartMemberGame,
  updateActiveUserStatus,
} from "~/utils/game.client";
import { GlobalContext } from "~/context/globalcontext";
import { createNewGameTable } from "~/utils/supabase.gameplay";

interface GameRequestNotificationProps {
  userId: string;
  rowData: any;
}

export default function GameRequestNotification({
  userId,
  rowData,
}: GameRequestNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const Root = useLoaderData();
  const navigate = useNavigate();

  const GameContext = useContext(GlobalContext);

  // Use different supabase clients with unique configurations
  const supabase = createBrowserClient(
    Root?.VITE_SUPABASE_URL,
    Root?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    { isSingleton: true },
  );
  const supabaseRealtimePairing = createBrowserClient(
    Root?.VITE_SUPABASE_URL,
    Root?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    { isSingleton: false },
  );
  const supabaseRealtimeMoves = createBrowserClient(
    Root?.VITE_SUPABASE_URL,
    Root?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    { isSingleton: false },
  );

  const isActive = rowData?.isActive;

  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      setIsProcessing(false);
    }, 300);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [GameContext]);

  const handleAccept = async () => {
    if (!GameContext?.memberRequest?.actionData || !userId || isProcessing)
      return;

    setIsProcessing(true);
    async function insertGameMovesGameNumber() {
      try {
        const incomingData = GameContext?.memberRequest?.actionData;
        console.log("Inserting game_moves with data:", incomingData);

        const { error: updateError } = await supabase
          .from("games_pairing")
          .update({
            status: "playing",
          })
          .eq("id", +incomingData.id);
        if (updateError) {
          console.error("Error inserting game moves:", updateError);
          return { ok: false, updateError };
        }
        const { data, error } = await supabase
          .from("game_moves")
          .insert({
            game_id: +incomingData.id,
            game_id_b: +incomingData.id,
            pgn: [],
            pgn_info: {
              date: new Date().toISOString(),
              gameid: 0,
              round: 1,
              white: incomingData.white_id,
              black: incomingData.black_id,
              result: "",
              termination: "",
              whiteelo: incomingData.whiteelo,
              blackelo: incomingData.blackelo,
              time_control: incomingData.timecontrol,
              is_rated: incomingData.is_rated ? "rated" : "unrated",
            },
            is_rated: incomingData.is_rated,
          })
          .select();

        if (error) {
          console.error("Error inserting game moves:", error);
          return { ok: false, error };
        }

        if (data && data.length > 0) {
          console.log(
            "Game moves inserted, creating game table for id:",
            data[0].id,
          );

          const { data: newTableData, error: newTableError } =
            await createNewGameTable(supabase, data[0].id);

          if (newTableError) {
            console.error(
              "Error creating new game number table:",
              newTableError,
            );
            return { ok: false, error: newTableError };
          }

          // FIX: Check for absence of error, not presence of data
          // createNewGameTable returns { data: null, error: null } on success
          console.log(
            "Game table created successfully, returning game_moves id:",
            data[0].id,
          );
          return {
            ok: true,
            message: "successfully inserted game moves and created game table",
            gameMoveId: data[0].id,
          };
        }

        return {
          ok: false,
          message: "No data returned from game_moves insert",
        };
      } catch (error) {
        console.error("Error in insertGameMovesGameNumber:", error);
        return { ok: false, error };
      }
    }

    const result = await insertGameMovesGameNumber();
    console.log("insertGameMovesGameNumber result:", result);

    if (result?.ok) {
      try {
        console.log("Looking up new game pairing...");
        let response = await getNewMemberGamePairing(
          GameContext.memberRequest.actionData,
          supabase,
        );
        console.log("getNewGamePairing response:", response);

        if (response?.go) {
          // Game found! Navigate to it
          console.log("Game found, updating user status and navigating...");
          const update_res = await updateActiveUserStatus(userId, supabase);
          console.log("updateActiveUserStatus result:", update_res);

          if (update_res && update_res.go) {
            localStorage.setItem(
              "pgnInfo",
              JSON.stringify({
                routing_id: response.data?.navigateId,
              }),
            );
          }

          // Clean up and navigate
          GameContext.setMemberRequest({});
          dismiss();
          navigate(`/game/${response?.data?.navigateId}`);
        } else {
          console.log(
            "getNewGamePairing returned go: false, response:",
            response,
          );
          // Even if getNewGamePairing fails, we can try navigating directly
          // using the game_moves id we just created
          if (result.gameMoveId) {
            console.log(
              "Attempting direct navigation with gameMoveId:",
              result.gameMoveId,
            );
            const update_res = await updateActiveUserStatus(userId, supabase);
            if (update_res && update_res.go) {
              localStorage.setItem(
                "pgnInfo",
                JSON.stringify({
                  routing_id: result.gameMoveId,
                }),
              );
            }
            GameContext.setMemberRequest({});
            dismiss();
            navigate(`/game/${result.gameMoveId}`);
          } else {
            GameContext.setMemberRequest({});
            dismiss();
          }
        }
      } catch (error) {
        console.error("Error processing game navigation:", error);
        GameContext.setMemberRequest({});
        dismiss();
      }
    } else {
      console.error("insertGameMovesGameNumber failed:", result);
      GameContext.setMemberRequest({});
      dismiss();
    }
  };

  const handleReject = async () => {
    // TODO: Optionally delete the games_pairing row or mark it as rejected
    try {
      async function deleteGamesPairing() {
        try {
          const { data, error } = await supabase
            .from("games_pairing")
            .delete()
            .eq("id", GameContext?.memberRequest?.actionData?.id);
        } catch (error) {
          console.error("Error deleting games pairing:", error);
        }
      }
      await deleteGamesPairing();
    } catch (error) {
      console.error("Error rejecting game request:", error);
    }
    dismiss();
    GameContext.setMemberRequest({});
  };

  // Listen for new games_pairing inserts (incoming challenge requests)
  useEffect(() => {
    if (!userId || isActive) return;

    console.log(
      "Setting up games_pairing websocket listener for user:",
      userId,
    );

    const channelPairing = supabaseRealtimePairing
      .channel("games-pairing-notifications") // Unique channel name
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games_pairing" },
        async (payload: any) => {
          console.log("games_pairing INSERT received:", payload);

          try {
            // Check if this pairing involves the current user as the challenged party
            // The current user should NOT be the one who created the request
            if (
              rowData &&
              !rowData.isActive &&
              !GameContext?.memberRequest?.actionData
            ) {
              console.log("Calling handleInsertStartMemberGame...");
              const result = await handleInsertStartMemberGame(
                supabase,
                userId,
                GameContext.setMemberRequest,
              );
              console.log("handleInsertStartMemberGame result:", result);
            }
          } catch (error) {
            console.error(
              "Error processing games_pairing notification:",
              error,
            );
            GameContext?.setMemberRequest({});
          }
        },
      )
      .subscribe((status) => {
        console.log("games_pairing channel status:", status);
      });

    return () => {
      console.log("Cleaning up games_pairing channel");
      supabaseRealtimePairing.removeChannel(channelPairing);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [
    userId,
    isActive,
    rowData,
    supabase,
    supabaseRealtimePairing,
    dismiss,
    GameContext,
  ]);

  // Listen for game_moves inserts (game actually started)
  useEffect(() => {
    if (!userId || !GameContext?.memberRequest?.ref) return;

    console.log("Setting up game_moves websocket listener");

    const channelMoves = supabaseRealtimeMoves
      .channel("game-moves-notifications") // Unique channel name
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_moves" },
        async (payload: any) => {
          try {
            if (GameContext?.memberRequest?.actionData && userId) {
              console.log("Looking up new game pairing...");
              let response = getNewGamePairing(
                GameContext.memberRequest.actionData,
                payload,
              );
              console.log("getNewGamePairing response:", response);

              if (response?.go) {
                // Game found! Navigate to it
                const update_res = await updateActiveUserStatus(
                  userId,
                  supabase,
                );
                if (update_res && update_res.go) {
                  localStorage.setItem(
                    "pgnInfo",
                    JSON.stringify({
                      routing_id: response.data?.navigateId,
                    }),
                  );
                }

                // Clean up and navigate
                GameContext.setMemberRequest({});
                navigate(`/game/${response?.data?.navigateId}`);
              } else {
                GameContext.setMemberRequest({});
              }
            }
          } catch (error) {
            console.error("Error processing game_moves notification:", error);
          }
        },
      )
      .subscribe((status) => {
        console.log("game_moves channel status:", status);
      });

    return () => {
      console.log("Cleaning up game_moves channel");
      supabaseRealtimeMoves.removeChannel(channelMoves);
    };
  }, [userId, supabase, supabaseRealtimeMoves, navigate, GameContext]);

  // Show notification when memberRequest.actionData is set
  useEffect(() => {
    if (GameContext?.memberRequest?.actionData && !isVisible) {
      setIsVisible(true);
      setIsExiting(false);

      // Auto-dismiss after 60 seconds
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, 60000);
    }
  }, [GameContext?.memberRequest?.actionData, isVisible, dismiss]);

  // Don't render if no actionData or not visible
  if (
    !isVisible ||
    !GameContext?.memberRequest?.actionData ||
    GameContext?.memberRequest?.ref == 1
  )
    return null;

  const actionData = GameContext.memberRequest.actionData;
  const timeControl = actionData?.timecontrol || "unknown";
  const isRated = actionData?.is_rated;
  const opponentName =
    GameContext?.memberRequest?.actionData.username_a == rowData?.username
      ? GameContext?.memberRequest?.actionData.username_b
      : GameContext?.memberRequest?.actionData?.username_a;

  return (
    <div
      className={`fixed top-20 right-4 z-50 w-80 transition-all duration-300 ease-out ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div className="rounded-xl border border-slate-700 bg-slate-800 shadow-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">♟️</span>
            <p className="text-sm font-semibold text-white">Game Challenge</p>
            {isRated && (
              <span className="ml-auto inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                Rated
              </span>
            )}
          </div>

          {/* Opponent info */}
          <div className="flex items-center gap-3 mb-3 rounded-lg bg-slate-700/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
              {opponentName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {opponentName}
              </p>
              <p className="text-xs text-slate-400">
                {timeControl} • {isRated ? "Rated" : "Casual"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg 
                         px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                         transition-all active:scale-95
                         ${
                           isProcessing
                             ? "bg-emerald-800 cursor-wait"
                             : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-md"
                         }`}
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Accept
                </>
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 
                         px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                         transition-all hover:bg-red-500 hover:shadow-md 
                         active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Reject
            </button>
          </div>
        </div>

        {/* Auto-dismiss progress bar */}
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-slate-500 animate-shrink-width"
            style={{ animationDuration: "60s" }}
          />
        </div>
      </div>
    </div>
  );
}
