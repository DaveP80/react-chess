import { useEffect, useRef, useState, useCallback, useContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Chess } from "chess.js";
import { dropTablesGameNumberGameMoves } from "~/utils/supabase.gameplay";
import { GlobalContext } from "~/context/globalcontext";

interface GameData {
  id: string;
  pgn_info?: {
    result?: string;
  };
}

interface ToggleUsers {
  toggle: boolean;
  orientation: "white" | "black" | "";
}

interface AbortCountdownProps {
  gameData: GameData | null;
  activeGame: Chess;
  toggleUsers: ToggleUsers;
  abortMessage: string | null;
  supabase: SupabaseClient;
  countdownIntervalRef: NodeJS.Timeout | null;
  countdown: number | null;
  setCountdown: (args: number | null) => void;
  clearCountdownTimer: () => void;
  setAbortMessage: (msg: string) => void;
}

export default function AbortCountdown({
  gameData,
  activeGame,
  toggleUsers,
  abortMessage,
  supabase,
  countdownIntervalRef,
  countdown,
  setCountdown,
  clearCountdownTimer,
  setAbortMessage,
}: AbortCountdownProps) {
  const countdownStartedRef = useRef(false);
  const abortCalledRef = useRef(false);
  const isWhitePlayerRef = useRef(false);
  const ActiveContext = useContext(GlobalContext);

  const executeAbort = useCallback(async () => {
    if (abortCalledRef.current) {
      return;
    }
    abortCalledRef.current = true;
    clearCountdownTimer();
    await dropTablesGameNumberGameMoves(supabase, gameData.id, gameData);
    setAbortMessage("Game Aborted.");
    localStorage.removeItem("pgnInfo");
  }, [supabase, gameData, clearCountdownTimer]);

  // Handle manual abort by white player
  const handleAbortGame = useCallback(async () => {
    if (abortCalledRef.current) {
      return;
    }
    await executeAbort();
    setCountdown(0);
    ActiveContext.setMemberRequestLock(true);
  }, [executeAbort]);

  useEffect(() => {
    if (
      !gameData?.pgn_info?.result &&
      activeGame.history().length === 0 &&
      toggleUsers.orientation &&
      !countdownStartedRef.current &&
      !abortMessage
    ) {
      countdownStartedRef.current = true;
      abortCalledRef.current = false;

      const isWhite = toggleUsers.orientation === "white";
      isWhitePlayerRef.current = isWhite;
      const initialCountdown = isWhite ? 15 : 16;

      setCountdown(initialCountdown);

      let currentCount = initialCountdown;

      countdownIntervalRef.current = setInterval(() => {
        currentCount -= 1;

        if (currentCount <= 0) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          setCountdown(0);
          // Check ref for current player status
          if (isWhitePlayerRef.current) {
            // White player executes abort
            if (!abortCalledRef.current) {
              abortCalledRef.current = true;
              dropTablesGameNumberGameMoves(supabase, gameData.id, gameData)
                .then(() => {
                  setAbortMessage("Game Aborted.");
                  ActiveContext.setMemberRequestLock(true);
                  localStorage.removeItem("pgnInfo");
                })
                .catch(console.error);
            }
          } else {
            setAbortMessage("Game Aborted.");
            ActiveContext.setMemberRequestLock(true);
            localStorage.removeItem("pgnInfo");
          }
        } else {
          setCountdown(currentCount);
        }
      }, 1000);

      if (!isWhite) {
        const pollInterval = setInterval(async () => {
          if (!countdownIntervalRef?.current) {
            clearInterval(pollInterval);
            return;
          }
          // Check database if current game and table have been aborted.
          const { data, error } = await supabase
            .from(`game_number_${gameData.id}`)
            .select("id")
            .eq("id", gameData.id)
            .single();

          if (error || !data) {
            clearInterval(pollInterval);
            clearCountdownTimer();
            setCountdown(0);
            setAbortMessage("Game Aborted.");
            localStorage.removeItem("pgnInfo");
            ActiveContext.setMemberRequestLock(true);
            return;
          }
        }, 400);
      }
    } else if (
      activeGame.history().length === 1 &&
      countdownStartedRef.current &&
      toggleUsers.orientation === "black"
    ) {
      clearCountdownTimer();
      setCountdown(null);
    }
  }, [
    gameData,
    activeGame,
    toggleUsers,
    abortMessage,
    supabase,
    ActiveContext,
    setAbortMessage,
    dropTablesGameNumberGameMoves,
    clearCountdownTimer,
  ]);

  const showCountdown = countdown !== null && countdown > 0 && !abortMessage;

  if (!showCountdown) return null;

  const maxTime = toggleUsers.orientation === "white" ? 15 : 16;
  const progressPercent = ((maxTime - (countdown || 0)) / maxTime) * 100;

  return (
    <section className="mt-4 mb-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-4 border-indigo-200" />
              <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
            <div>
              <p className="text-sm text-indigo-600">
                {toggleUsers.orientation === "white"
                  ? "You can abort the game"
                  : "Waiting for white to move"}
              </p>
              <p className="text-sm text-indigo-600">
                Countdown:{" "}
                <span className="font-mono font-semibold">{countdown}s</span>
              </p>
            </div>
          </div>
          {toggleUsers.orientation === "white" && (
            <button
              type="button"
              onClick={handleAbortGame}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-indigo-600 shadow-sm transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              Abort
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
