import React, { useEffect } from "react";
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
  useEffect(() => {
    if (finalGameData?.pgn_info?.result && orientation && currentOpening) {
      try {
        let winner_insert;
        switch (finalGameData.pgn_info.result) {
          case "1-0": {
            winner_insert = "white";
            orientation == "white"
              ? playGameEndSound("Victory")
              : playGameEndSound("Loss");
            break;
          }
          case "0-1": {
            winner_insert = "black";
            orientation == "black"
              ? playGameEndSound("Victory")
              : playGameEndSound("Victory");
            break;
          }
          case "1/2-1/2": {
            winner_insert = "draw";
            playGameEndSound("Draw");
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
          }
          updateTablesOnGameOver(
            supabase,
            gameData.game_id,
            gameData.game_id_b,
            {
              ...finalGameData?.pgn_info,
              whiteelo:
                gameData.pgn_info.is_rated == "rated"
                  ? player_w
                  : gameData.pgn_info.whiteelo,
              blackelo:
                gameData.pgn_info.is_rated == "rated"
                  ? player_b
                  : gameData.pgn_info.blackelo,
            },
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
            currentOpening.eco,
          );
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
