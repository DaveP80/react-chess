import React, { useContext, useEffect, useRef } from "react";
import { GlobalContext } from "~/context/globalcontext";
import { EloEstimate, processIncomingPgn } from "~/utils/helper";
import { playGameEndSound } from "~/utils/sounds";
import { updateTablesOnGameOver } from "~/utils/supabase.gameplay";

export default function UpdateTablesGameEnd({
  finalGameData,
  orientation,
  gameData,
  timeOut,
  supabase,
  activeGame,
  currentOpening,
}) {
  // Track whether we've already played the game end sound for this game
  const soundPlayedRef = useRef<boolean>(false);
  // Track the game ID to reset the ref if we navigate to a different game
  const gameIdRef = useRef<number | null>(null);
  const ActiveGame = useContext(GlobalContext);

  useEffect(() => {
    if (finalGameData?.pgn_info?.result && orientation) {
      // Reset sound played flag if this is a different game
      if (gameIdRef.current !== gameData?.id) {
        gameIdRef.current = gameData?.id;
        soundPlayedRef.current = false;
      }

      try {
        let winner_insert;
        switch (finalGameData.pgn_info.result) {
          case "1-0": {
            winner_insert = "white";
            // Only play sound if it hasn't been played yet for this game
            if (!soundPlayedRef.current) {
              soundPlayedRef.current = true;
              orientation == "white"
                ? playGameEndSound("Victory")
                : playGameEndSound("Loss");
            }
            break;
          }
          case "0-1": {
            winner_insert = "black";
            if (!soundPlayedRef.current) {
              soundPlayedRef.current = true;
              orientation == "black"
                ? playGameEndSound("Victory")
                : playGameEndSound("Loss");
            }
            break;
          }
          case "1/2-1/2": {
            winner_insert = "draw";
            if (!soundPlayedRef.current) {
              soundPlayedRef.current = true;
              playGameEndSound("Draw");
            }
            break;
          }
          case "0-0": {
            winner_insert = "abort";
            break;
          }
        }
        // Don't run updateTablesOnGameOver for abort - already handled by dropTables
        if (winner_insert === "abort") {
          return;
        }

        const [player_w, player_b] = EloEstimate({
          white_elo: gameData.pgn_info.whiteelo,
          black_elo: gameData.pgn_info.blackelo,
          winner: winner_insert,
          game_counts: [gameData.white_count, gameData.black_count],
        });
        if (
          (processIncomingPgn(activeGame.turn(), orientation) &&
            timeOut !== "white" &&
            timeOut !== "black") ||
          (!processIncomingPgn(activeGame.turn(), orientation) &&
            (timeOut == "white" || timeOut == "black"))
        ) {
          if (gameData.status == "end") {
            return;
          };
          updateTablesOnGameOver(
            supabase,
            gameData.game_id,
            gameData.game_id_b,
            finalGameData.pgn_info,
            finalGameData?.pgn,
            gameData.pgn_info.white,
            gameData.pgn_info.black,
            gameData.pgn_info.is_rated == "rated"
              ? player_w
              : gameData.pgn_info.whiteelo,
            gameData.pgn_info.is_rated == "rated"
              ? player_b
              : gameData.pgn_info.blackelo,
            gameData.timecontrol,
            gameData.id,
            currentOpening?.eco || "",
          );
          //disable getting new incoming game requests, until rematch is resolved.
          ActiveGame.setMemberRequestLock(true);
        };
      } catch (error) {
        console.error(error);
      } finally {
        localStorage.removeItem("pgnInfo");
      }
    }
  }, [finalGameData, orientation, currentOpening]);

  return null;
}