import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useNavigate, useRouteLoaderData } from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import {
  getNewGamePairing,
  getNewMemberGamePairing,
  handleInsertStartRematchGame,
  updateActiveUserStatus,
} from "~/utils/game.client";
import { GlobalContext } from "~/context/globalcontext";
import { createNewGameTable } from "~/utils/supabase.gameplay";
import { Check, Swords, X } from "lucide-react";

export default function RematchRequestNotification({
  rematchRequest,
  setRematchRequest,
  showNotification,
  setShowNotification,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const Root = useRouteLoaderData("root");
  const navigate = useNavigate();

  const ActiveContext = useContext(GlobalContext);

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

  const dismiss = useCallback(() => {
    setShowNotification(false);
    setTimeout(() => {
      setIsProcessing(false);
    }, 300);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [setShowNotification]);

  const handleAccept = async () => {
    if (!rematchRequest?.actionData || !Root?.user?.id || isProcessing) {
      return;
    }

    setIsProcessing(true);
    async function insertGameMovesGameNumber() {
      try {
        const incomingData = rematchRequest?.actionData;
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
              gameid: rematchRequest.actionData.is_random ? 1 : 0,
              round: 1,
              white: incomingData.white_id,
              black: incomingData.black_id,
              result: "",
              termination: "",
              whiteelo: incomingData.whiteelo,
              blackelo: incomingData.blackelo,
              time_control: incomingData.timecontrol,
              is_rated: incomingData.is_rated ? "rated" : "unrated",
              eco: "",
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
          rematchRequest?.actionData,
          supabase,
        );
        console.log("getNewGamePairing response:", response);

        if (response?.go) {
          // Game found! Navigate to it
          console.log("Game found, updating user status and navigating...");
          const update_res = await updateActiveUserStatus(
            Root?.user.id,
            supabase,
          );
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
          setRematchRequest({});
          dismiss();
          //navigate(`/game/${response?.data?.navigateId}`);
          window.location.href = `/game/${response?.data?.navigateId}`;
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
            const update_res = await updateActiveUserStatus(
              Root?.user?.id,
              supabase,
            );
            if (update_res && update_res.go) {
              localStorage.setItem(
                "pgnInfo",
                JSON.stringify({
                  routing_id: result.gameMoveId,
                }),
              );
            }
            setRematchRequest({});
            dismiss();
            ActiveContext.setRematchRequestLock(false);
            //navigate(`/game/${result.gameMoveId}`);
            window.location.href = `/game/${result.gameMoveId}`;
          } else {
            setRematchRequest({});
            dismiss();
            ActiveContext.setRematchRequestLock(false);
          }
        }
      } catch (error) {
        console.error("Error processing game navigation:", error);
        setRematchRequest({});
        dismiss();
        ActiveContext.setRematchRequestLock(false);
      }
    } else {
      console.error("insertGameMovesGameNumber failed:", result);
      setRematchRequest({});
      ActiveContext.setRematchRequestLock(false);
      dismiss();
    }
  };

  const handleReject = async () => {
    // TODO: Optionally delete the games_pairing row or mark it as rejected
    try {
      await supabase
        .from("games_pairing")
        .delete()
        .eq("id", rematchRequest?.actionData?.id);
    } catch (error) {
      console.error("Error rejecting game request:", error);
    }
    dismiss();
    setRematchRequest({});
    ActiveContext.setMemberRequestLock(false);
  };

  // Listen for new games_pairing inserts (incoming challenge requests)
  useEffect(() => {
    if (!Root?.user?.id) return;

    console.log(
      "Setting up games_pairing websocket listener for user:",
      Root?.rowData?.username,
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
            if (!rematchRequest?.actionData) {
              console.log("Calling handleInsertStartMemberGame...");
              const result = await handleInsertStartRematchGame(
                supabase,
                Root?.user.id,
                setRematchRequest,
              );
              console.log("handleInsertStartMemberGame result:", result);
            }
          } catch (error) {
            console.error(
              "Error processing games_pairing notification:",
              error,
            );
            setRematchRequest({});
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "games_pairing" },
        (payload: any) => {
          console.log("games_pairing DELETE received:", payload);

          // Check if the deleted row matches our pending rematch request
          const deletedRow = payload.old;
          if (
            rematchRequest?.actionData?.id &&
            deletedRow?.id === rematchRequest.actionData.id &&
            rematchRequest?.ref
          ) {
            console.log("Our rematch request was declined, resetting state...");

            // Reset the rematch request state so the form shows again
            setRematchRequest({});
            setShowNotification(false);
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
    Root?.user?.id,
    supabase,
    supabaseRealtimePairing,
    dismiss,
    rematchRequest,
  ]);

  // Listen for game_moves inserts (game actually started)
  useEffect(() => {
    if (!supabaseRealtimeMoves) return;

    console.log("Setting up game_moves websocket listener");

    const channelMoves = supabaseRealtimeMoves
      .channel("game-moves-notifications") // Unique channel name
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_moves" },
        async (payload: any) => {
          try {
            if (rematchRequest?.ref && Root?.user?.id) {
              console.log("Looking up new game pairing...");
              let response = getNewGamePairing(
                rematchRequest.actionData,
                payload,
              );
              console.log("getNewGamePairing response:", response);

              if (response?.go) {
                // Game found! Navigate to it
                const update_res = await updateActiveUserStatus(
                  Root?.user?.id,
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
                setRematchRequest({});
                setShowNotification(false);
                ActiveContext.setMemberRequestLock(false);
                //navigate(`/game/${response?.data?.navigateId}`);
                window.location.href = `/game/${response?.data?.navigateId}`;
              } else {
                setRematchRequest({});
                setShowNotification(false);
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
  }, [
    Root?.user.id,
    supabase,
    supabaseRealtimeMoves,
    navigate,
    rematchRequest,
  ]);

  // Show notification when memberRequest.actionData is set
  useEffect(() => {
    if (
      rematchRequest?.actionData &&
      !rematchRequest?.ref &&
      !showNotification
    ) {
      setShowNotification(true);

      // Auto-dismiss after 60 seconds
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, 180000);
    }
  }, [rematchRequest?.actionData, showNotification, dismiss]);

  // Don't render if no actionData or not visible
  if (
    !showNotification ||
    !rematchRequest?.actionData ||
    rematchRequest?.ref == 1
  ) {
    return null;
  }
  const opponentName =
    rematchRequest.actionData.username_a === Root?.rowData?.username
      ? rematchRequest.actionData.username_b
      : rematchRequest.actionData.username_a;
  return (
    <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Swords className="text-emerald-400" size={18} />
        <p className="text-sm font-semibold text-emerald-400">
          Rematch Challenge!
        </p>
      </div>

      {/* Challenger info */}
      <div className="flex items-center gap-3 mb-4 rounded-lg bg-slate-700/50 p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
          {opponentName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {opponentName}
          </p>
          <p className="text-xs text-slate-400">wants a rematch</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 
                     text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]
                         ${
                           isProcessing
                             ? "bg-emerald-800 cursor-wait"
                             : "bg-emerald-600 hover:bg-emerald-500"
                         }`}
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Starting...
            </>
          ) : (
            <>
              <Check size={16} />
              Accept
            </>
          )}
        </button>
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-600 
                         px-4 py-2.5 text-sm font-semibold text-white shadow-sm 
                     transition-all hover:bg-slate-500 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X size={16} />
          Decline
        </button>
      </div>

      {/* Timer indicator */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full bg-emerald-500 rounded-full"
          style={{
            animation: "shrink-width 180s linear forwards",
          }}
        />
      </div>
      <p className="text-xs text-slate-500 text-center mt-1">
        Expires in 3 minutes
      </p>

      <style>{`
        @keyframes shrink-width {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
