import { useEffect, useState, useRef, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FlagIcon,
  Search,
  Clipboard,
} from "lucide-react";
import {
  timeControlReducer,
  parseTimeControl,
  processIncomingPgn,
  SUPABASE_CONFIG,
  parsePgnEntry,
  timeOutGameOverReducer,
  gameStartFinishReducer,
  EloEstimate,
  copyDivContents,
  makePGNInfoString,
} from "~/utils/helper";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import {
  redirect,
  useLoaderData,
  useNavigate,
  useRouteLoaderData,
} from "@remix-run/react";
import { ChessClock, ChessClockHandle } from "~/components/ChessClock";
import { getSupabaseBrowserClient } from "~/utils/supabase.client";
import {
  dropTablesGameNumberGameMoves,
  insertNewMoves,
  updateTablesOnGameOver,
} from "~/utils/supabase.gameplay";
import { createBrowserClient } from "@supabase/ssr";
import { lookup_userdata_on_gameid } from "~/utils/apicalls.server";
import OfferDraw from "~/components/OfferDraw";
import RatingInfo from "~/components/RatingInfo";

export const meta: MetaFunction = () => {
  return [
    { title: "Chess Game - Play Online" },
    {
      name: "description",
      content: "Interactive chess game built with Remix and react-chessboard",
    },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const gameId = params.id;

  try {
    const { client, headers } = createSupabaseServerClient(request);
    const { data: userData } = await client.auth.getClaims();
    const response = await lookup_userdata_on_gameid(
      client,
      headers,
      Number(gameId),
      userData,
    );
    return response;
  } catch (error) {
    return redirect("/myhome");
  }
}

export default function Index() {
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [resign, setResign] = useState<boolean | string>(false);
  const UserContext = useRouteLoaderData<typeof loader>("root");
  const [toggleUsers, setToggleUsers] = useState({
    toggle: false,
    orientation: "",
    oppUsername: "",
    myUsername: UserContext?.user?.username,
    oppAvatarURL: "",
    myAvatarURL: UserContext?.user?.avatarUrl,
    gameTimeLength: "",
    oppElo: 1500,
    myElo: 1500,
  });

  const [activeGame, setActiveGame] = useState(new Chess());
  const [draw, setDraw] = useState("");
  const [isReplay, setIsReplay] = useState<null | number>(null);
  const [replayFenHistory, setReplayFenHistory] = useState<any>();
  const [finalGameData, setFinalGameData] = useState({});
  const [countdown, setCountdown] = useState<number | null>(null); // null = not started
  const [abortMessage, setAbortMessage] = useState("");
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortCalledRef = useRef<boolean>(false);
  const countdownStartedRef = useRef<boolean>(false);
  // Store orientation in a ref so interval callback always has current value
  const isWhitePlayerRef = useRef<boolean>(false);
  const { data: gameData } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [initialTime, increment] = parseTimeControl(
    gameData?.timecontrol || "unlimited",
  );
  const [timeOut, setTimeOut] = useState<
    "white" | "black" | "game over" | null
  >(null);
  const [loadedWhiteTime, setLoadedWhiteTime] = useState<number | undefined>(
    undefined,
  );
  const [loadedBlackTime, setLoadedBlackTime] = useState<number | undefined>(
    undefined,
  );
  const [pgnInfoString, setpgnInfoString] = useState<string>("");
  const chessClockRef = useRef<ChessClockHandle>(null);
  const supabase = getSupabaseBrowserClient(true);
  const supabase2 = createBrowserClient(
    SUPABASE_CONFIG[0],
    SUPABASE_CONFIG[1],
    SUPABASE_CONFIG[2],
  );

  // Clear countdown timer
  const clearCountdownTimer = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Execute abort - only white player calls this
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
  }, [executeAbort]);

  // Setup toggleUsers when gameData loads
  useEffect(() => {
    if (gameData) {
      const [game_length, timeControl] = timeControlReducer(
        gameData?.timecontrol || "",
      );

      const isWhite = gameData.white_username === UserContext?.rowData.username;
      isWhitePlayerRef.current = isWhite;

      setToggleUsers({
        ...toggleUsers,
        toggle: true,
        orientation: isWhite ? "white" : "black",
        oppUsername: isWhite
          ? gameData.black_username
          : gameData.white_username,
        myUsername: UserContext?.rowData.username,
        oppAvatarURL: isWhite ? gameData.black_avatar : gameData.white_avatar,
        myAvatarURL: UserContext?.rowData.avatarURL,
        gameTimeLength: game_length,
        oppElo:
          gameData.white_rating[timeControl] ==
          UserContext?.rowData.rating[timeControl]
            ? gameData.black_rating[timeControl]
            : gameData.white_rating[timeControl],
        myElo: UserContext?.rowData.rating[timeControl],
      });

      if (gameData.pgn.length) {
        const currGamePgn = gameData.pgn;
        const lastEntry = parsePgnEntry(currGamePgn[currGamePgn.length - 1]);

        const newGame = new Chess();

        currGamePgn.forEach((pgnEntry: string) => {
          const parsedEntry = parsePgnEntry(pgnEntry);
          newGame.move({
            from: parsedEntry.from,
            to: parsedEntry.to,
            promotion: "q",
          });
        });

        setActiveGame(newGame);
        setCurrentMoveIndex(newGame.history().length - 1);

        if (
          lastEntry.whiteTime !== null &&
          lastEntry.blackTime !== null &&
          lastEntry.timestamp
        ) {
          const lastMoveTime = new Date(lastEntry.timestamp).getTime();
          const now = Date.now();
          const elapsedSeconds = (now - lastMoveTime) / 1000;
          const resultData = [
            gameData.pgn_info.result,
            gameData.pgn_info.termination,
          ];

          const currentTurn = newGame.turn();

          let adjustedWhiteTime = lastEntry.whiteTime;
          let adjustedBlackTime = lastEntry.blackTime;

          if (currentTurn === "w") {
            adjustedWhiteTime = Math.max(
              0,
              lastEntry.whiteTime - elapsedSeconds,
            );
            if (
              adjustedWhiteTime === 0 &&
              lastEntry.whiteTime > 0 &&
              !resultData[0]
            ) {
              handleTimeOut("white");
            }
          } else {
            adjustedBlackTime = Math.max(
              0,
              lastEntry.blackTime - elapsedSeconds,
            );
            if (
              adjustedBlackTime === 0 &&
              lastEntry.blackTime > 0 &&
              !resultData[0]
            ) {
              handleTimeOut("black");
            }
          }
          if (!gameData.pgn_info.result) {
            setLoadedWhiteTime(adjustedWhiteTime);
            setLoadedBlackTime(adjustedBlackTime);
          } else {
            setLoadedWhiteTime(lastEntry.whiteTime);
            setLoadedBlackTime(lastEntry.blackTime);
          }
        }
      }

      if (gameData.pgn_info.result) {
        const endGameData = gameData.pgn_info;
        setTimeOut("game over");
        makePGNInfoString(gameData, setpgnInfoString);
        setFinalGameData(gameData);
        switch (endGameData.result) {
          case "1-0": {
            if (endGameData.termination.includes("resignation")) {
              setResign("Black");
            }
            break;
          }
          case "0-1": {
            if (endGameData.termination.includes("resignation")) {
              setResign("White");
            }
            break;
          }
          case "1/2-1/2": {
            if (endGameData.termination.includes("Draw")) {
              setDraw("");
            }
            break;
          }
          case "0-0": {
            setAbortMessage("Game Aborted.");
            break;
          }
          default: {
            console.log("out of bounds result in pgn_info");
          }
        }
      }
      if (gameData.draw_offer) {
        const drawAgreement = gameData.draw_offer
          ? gameData.draw_offer.split("$")
          : [];
        if (drawAgreement.length == 1) {
          setDraw(gameData.draw_offer);
        } else if (drawAgreement.length == 2) {
          setDraw("");
        }
      } else if (!gameData.draw_offer) {
        setDraw("");
      }
    }

    return () => {};
  }, [gameData]);

  // Start countdown when toggleUsers is set and game hasn't started
  useEffect(() => {
    // Only start if:
    // 1. gameData exists
    // 2. No result yet
    // 3. No moves made
    // 4. toggleUsers is initialized (orientation set)
    // 5. Countdown hasn't started yet
    // 6. No abort message
    if (
      gameData &&
      !gameData.pgn_info.result &&
      activeGame.history().length === 0 &&
      toggleUsers.toggle &&
      toggleUsers.orientation &&
      !countdownStartedRef.current &&
      !abortMessage
    ) {
      countdownStartedRef.current = true;
      abortCalledRef.current = false;

      const isWhite = toggleUsers.orientation === "white";
      isWhitePlayerRef.current = isWhite;
      const initialCountdown = isWhite ? 15 : 16;

      console.log("Starting countdown timer", { isWhite, initialCountdown });
      setCountdown(initialCountdown);

      // Use a simple countdown approach
      let currentCount = initialCountdown;

      countdownIntervalRef.current = setInterval(() => {
        currentCount -= 1;
        console.log("Countdown tick:", currentCount);

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
                  localStorage.removeItem("pgnInfo");
                })
                .catch(console.error);
            }
          } else {
            // Black player just shows message
            setAbortMessage("Game Aborted.");
            localStorage.removeItem("pgnInfo");
          }
        } else {
          setCountdown(currentCount);
        }
      }, 1000);
    }
  }, [gameData, activeGame, toggleUsers, abortMessage, supabase]);

  // Websocket subscription
  useEffect(() => {
    const channel = supabase2
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: `game_number_${gameData?.id || "0"}`,
        },
        async (payload: { eventType: string }) => {
          if (payload.eventType === "UPDATE") {
            try {
              const { data, error } = await supabase
                .from(`game_number_${gameData?.id || "0"}`)
                .select("*")
                .eq("id", gameData.id);
              if (data && data.length > 0) {
                const newMovePgn = data[0].pgn;
                const arrayLength = newMovePgn.length;

                if (arrayLength > 0) {
                  const lastEntry = parsePgnEntry(
                    newMovePgn[newMovePgn.length - 1],
                  );

                  if (newMovePgn.length > activeGame.history().length) {
                    const newGame = new Chess();
                    if (activeGame.history().length == 0) {
                      clearCountdownTimer();
                      setCountdown(null);
                    }

                    newMovePgn.forEach((pgnEntry: string) => {
                      const parsedEntry = parsePgnEntry(pgnEntry);
                      newGame.move({
                        from: parsedEntry.from,
                        to: parsedEntry.to,
                        promotion: "q",
                      });
                    });

                    setActiveGame(newGame);
                    setCurrentMoveIndex(newGame.history().length - 1);
                    setIsReplay(null);

                    // First move made - clear countdown for both players
                    if (newGame.history().length >= 1) {
                      clearCountdownTimer();
                      setCountdown(null);
                    }

                    if (
                      lastEntry.whiteTime !== null &&
                      lastEntry.blackTime !== null &&
                      lastEntry.timestamp
                    ) {
                      const lastMoveTime = new Date(
                        lastEntry.timestamp,
                      ).getTime();
                      const now = Date.now();
                      const elapsedSeconds = (now - lastMoveTime) / 1000;

                      const currentTurn = newGame.turn();

                      let adjustedWhiteTime = lastEntry.whiteTime;
                      let adjustedBlackTime = lastEntry.blackTime;

                      if (currentTurn === "w") {
                        adjustedWhiteTime = Math.max(
                          0,
                          lastEntry.whiteTime - elapsedSeconds,
                        );
                        if (
                          adjustedWhiteTime === 0 &&
                          lastEntry.whiteTime > 0
                        ) {
                          handleTimeOut("white");
                        }
                      } else {
                        adjustedBlackTime = Math.max(
                          0,
                          lastEntry.blackTime - elapsedSeconds,
                        );
                        if (
                          adjustedBlackTime === 0 &&
                          lastEntry.blackTime > 0
                        ) {
                          handleTimeOut("black");
                        }
                      }
                      if (!data[0].pgn_info.result) {
                        setLoadedWhiteTime(adjustedWhiteTime);
                        setLoadedBlackTime(adjustedBlackTime);
                      } else {
                        setLoadedWhiteTime(lastEntry.whiteTime);
                        setLoadedBlackTime(lastEntry.blackTime);
                      }
                    }
                  }
                  if (data[0].pgn_info.result) {
                    const endGameData = data[0].pgn_info;

                    setFinalGameData(data[0]);
                    if (!endGameData.termination.includes("time")) {
                      setTimeOut("game over");
                    }
                    makePGNInfoString(data[0], setpgnInfoString);
                    switch (endGameData.result) {
                      case "1-0": {
                        if (endGameData.termination.includes("resignation")) {
                          !resign && setResign("Black");
                        }
                        break;
                      }
                      case "0-1": {
                        if (endGameData.termination.includes("resignation")) {
                          !resign && setResign("White");
                        }
                        break;
                      }
                      case "1/2-1/2": {
                        if (endGameData.termination.includes("Draw")) {
                          setDraw("");
                        }
                        break;
                      }
                      case "0-0": {
                        setAbortMessage("Game Aborted.");
                        break;
                      }
                      default: {
                        ("default case");
                      }
                    }
                  }
                  if (data[0].draw_offer) {
                    const drawAgreement = data[0].draw_offer
                      ? data[0].draw_offer.split("$")
                      : [];
                    if (drawAgreement.length == 1) {
                      setDraw(data[0].draw_offer);
                    } else if (drawAgreement.length == 2) {
                      setDraw("");
                    }
                  } else if (!data[0].draw_offer) {
                    setDraw("");
                  }
                }
              }
            } catch (error) {
              console.error(error);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const updateGameResult = async () => {
      const [result, termination] = gameStartFinishReducer(
        activeGame,
        timeOut,
        gameData,
        resign,
      );
      if (
        result &&
        termination &&
        (timeOut == "white" || timeOut == "black") &&
        !gameData.pgn_info.result &&
        processIncomingPgn(activeGame.turn(), toggleUsers.orientation)
      ) {
        try {
          await supabase
            .from(`game_number_${gameData.id}`)
            .update({ pgn_info: { ...gameData.pgn_info, result, termination } })
            .eq("id", gameData.id);
        } catch (error) {
          console.error(error);
        }
      }
    };

    updateGameResult();
  }, [timeOut]);

  useEffect(() => {
    if (finalGameData?.pgn_info?.result) {
      try {
        let winner_insert;
        switch (finalGameData.pgn_info.result) {
          case "1-0": {
            winner_insert = "white";
            break;
          }
          case "0-1": {
            winner_insert = "black";
            break;
          }
          case "1/2-1/2": {
            winner_insert = "draw";
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
          (processIncomingPgn(activeGame.turn(), toggleUsers.orientation) &&
            timeOut !== "white" &&
            timeOut !== "black") ||
          (!processIncomingPgn(activeGame.turn(), toggleUsers.orientation) &&
            (timeOut == "white" || timeOut == "black") &&
            UserContext.rowData.isActive)
        ) {
          updateTablesOnGameOver(
            supabase,
            gameData.game_id,
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
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        localStorage.removeItem("pgnInfo");
      }
    }
  }, [finalGameData, toggleUsers.orientation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCountdownTimer();
    };
  }, [clearCountdownTimer]);

  const goToStart = () => {
    if (activeGame.history().length > 0) {
      setReplayFenHistory(activeGame.history({ verbose: true })[0].before);
      setIsReplay(-1);
      setCurrentMoveIndex(-1);
    }
  };

  const goToEnd = () => {
    if (activeGame.history().length > 0) {
      const lastIndex = activeGame.history().length - 1;
      setReplayFenHistory(
        activeGame.history({ verbose: true })[lastIndex].after,
      );
      setIsReplay(null);
      setCurrentMoveIndex(lastIndex);
    }
  };

  const goToPrevious = () => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      setReplayFenHistory(
        activeGame.history({ verbose: true })[newIndex].after,
      );
      setIsReplay(newIndex);
      setCurrentMoveIndex(newIndex);
    }
  };

  const goToNext = () => {
    if (currentMoveIndex < activeGame.history().length - 1) {
      const newIndex = currentMoveIndex + 1;
      setReplayFenHistory(
        activeGame.history({ verbose: true })[newIndex].after,
      );
      if (newIndex === activeGame.history().length - 1) {
        setIsReplay(null);
      } else {
        setIsReplay(newIndex);
      }
      setCurrentMoveIndex(newIndex);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          goToStart();
          break;
        case "ArrowDown":
          e.preventDefault();
          goToEnd();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext, goToStart, goToEnd]);

  async function onDrop(sourceSquare: string, targetSquare: string) {
    const resultGame = finalGameData?.pgn_info;
    try {
      const actualTurn = activeGame.turn();

      if (
        isReplay ||
        resign ||
        activeGame.isThreefoldRepetition() ||
        !processIncomingPgn(actualTurn, toggleUsers.orientation) ||
        timeOut !== null ||
        resultGame?.result ||
        abortMessage
      ) {
        return false;
      }

      const move = activeGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move === null) {
        return false;
      }

      // Move was successful - clear countdown timer since game has started
      if (activeGame.history().length === 1) {
        clearCountdownTimer();
        setCountdown(null);
      }

      setActiveGame(new Chess(activeGame.fen()));
      setCurrentMoveIndex(activeGame.history().length - 1);

      const currentTimes = chessClockRef.current?.getCurrentTimes();

      const [result, termination] = gameStartFinishReducer(
        activeGame,
        timeOut,
        gameData,
        resign,
      );

      await insertNewMoves(
        supabase,
        [sourceSquare, targetSquare],
        gameData.id,
        draw,
        result,
        termination,
        gameData,
        currentTimes?.whiteTime,
        currentTimes?.blackTime,
      );

      return true;
    } catch (error) {
      console.error("Error in onDrop:", error);
      return false;
    }
  }

  function handleTimeOut(player: "white" | "black" | "game over") {
    setTimeOut(player);
  }

  async function resignGame() {
    const isGameOver =
      activeGame.isGameOver() ||
      timeOut !== null ||
      activeGame.isThreefoldRepetition() ||
      Boolean(finalGameData?.pgn_info?.result);
    if (isGameOver || abortMessage) {
      return null;
    }
    if (activeGame.history().length < 1) {
      return null;
    }
    if (!resign) {
      const colorPreference =
        gameData.white_username == UserContext?.rowData.username
          ? "white"
          : "black";
      const [result, termination] = gameStartFinishReducer(
        activeGame,
        timeOut,
        gameData,
        colorPreference,
      );
      if (result && termination && !gameData.pgn_info.result) {
        try {
          await supabase
            .from(`game_number_${gameData.id}`)
            .update({ pgn_info: { ...gameData.pgn_info, result, termination } })
            .eq("id", gameData.id);
        } catch (error) {
          console.error(error);
        }
      }
      setResign(colorPreference);
    }
  }

  const handleSetReplay = (idx: number) => {
    if (idx != activeGame.history().length - 1) {
      setReplayFenHistory(activeGame.history({ verbose: true })[idx].after);
      setIsReplay(idx);
      setCurrentMoveIndex(idx);
    }
    if (idx == activeGame.history().length - 1) {
      setIsReplay(null);
      setReplayFenHistory(
        activeGame.history({ verbose: true })[activeGame.history().length - 1]
          .after,
      );
      setCurrentMoveIndex(activeGame.history().length - 1);
    }
  };

  const isThreeFoldRepit = activeGame.isThreefoldRepetition();
  const isGameOver = Boolean(
    activeGame.isGameOver() ||
      timeOut !== null ||
      resign ||
      isThreeFoldRepit ||
      finalGameData?.pgn_info?.result,
  );

  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isCheck = activeGame.isCheck();
  const isStalemate = activeGame.isStalemate();
  const isFiftyMove = activeGame.isDrawByFiftyMoves();
  const isInsufficient = activeGame.isInsufficientMaterial();

  const actualGameTurn = activeGame.turn();
  const drawAgreement =
    finalGameData?.pgn_info?.termination &&
    finalGameData?.pgn_info?.termination.includes("Agreement")
      ? true
      : false;

  // Check if countdown should be visible
  const showCountdown = countdown !== null && countdown > 0 && !abortMessage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-3">Chess Game</h1>
            <p className="text-slate-300 text-lg">
              Built with Remix and react-chessboard
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    {isCheck && !isCheckmate && (
                      <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-semibold">
                        Check!
                      </span>
                    )}
                    {isCheckmate && (
                      <span className="bg-red-100 text-red-800 px-4 py-2 rounded-lg font-semibold">
                        Checkmate!
                      </span>
                    )}
                    {isDraw && (
                      <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
                        Draw!
                      </span>
                    )}
                  </div>
                  {!isGameOver && (
                    <button
                      onClick={resignGame}
                      className="flex items-center gap-2 bg-red-900 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <FlagIcon size={20} />
                      Resign
                    </button>
                  )}

                  {!isGameOver && (
                    <OfferDraw
                      context={{
                        draw,
                        gameData,
                        UserContext,
                        moveHistory: activeGame.history(),
                        actualTurn: actualGameTurn,
                        orientation: toggleUsers.orientation,
                        supabase,
                      }}
                    />
                  )}
                  {showCountdown && (
                    <section className="mt-4 mb-4">
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-10 w-10 rounded-full border-4 border-indigo-200"></div>
                              <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                            </div>
                            <div>
                              <p className="text-sm text-indigo-600">
                                {toggleUsers.orientation === "white"
                                  ? "You can abort the game"
                                  : "Waiting for white to move"}
                              </p>
                              <p className="text-sm text-indigo-600">
                                Countdown:{" "}
                                <span className="font-mono font-semibold">
                                  {countdown}s
                                </span>
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
                              style={{
                                width: `${
                                  (((toggleUsers.orientation === "white"
                                    ? 15
                                    : 16) -
                                    (countdown || 0)) /
                                    (toggleUsers.orientation === "white"
                                      ? 15
                                      : 16)) *
                                  100
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
                <div className="mb-1 flex justify-start">
                  {toggleUsers.toggle && (
                    <section>
                      <p>{toggleUsers.oppUsername}</p>
                      <img src={toggleUsers.oppAvatarURL}></img>
                      <p>{toggleUsers.oppElo}</p>
                    </section>
                  )}
                </div>
                <Chessboard
                  position={
                    (
                      replayFenHistory
                        ? replayFenHistory == activeGame.fen()
                        : true
                    )
                      ? activeGame.fen()
                      : replayFenHistory
                  }
                  onPieceDrop={onDrop}
                  boardWidth={Math.min(
                    600,
                    typeof window !== "undefined"
                      ? window.innerWidth - 48
                      : 600,
                  )}
                  boardOrientation={toggleUsers.orientation || "white"}
                />
                <div className="mb-1 flex justify-start">
                  {toggleUsers.toggle && (
                    <section>
                      <p>{toggleUsers.myUsername}</p>
                      <img src={toggleUsers.myAvatarURL}></img>
                      <p>{toggleUsers.myElo}</p>
                    </section>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                  Game Info
                </h2>
                <RatingInfo
                  gameData={gameData}
                  winner={finalGameData?.pgn_info?.result || ""}
                />

                <ChessClock
                  ref={chessClockRef}
                  initialTime={initialTime}
                  increment={increment}
                  currentTurn={actualGameTurn}
                  isGameOver={isGameOver}
                  onTimeOut={handleTimeOut}
                  hasResult={finalGameData?.pgn_info?.result}
                  moveCount={activeGame.history().length}
                  loadedWhiteTime={loadedWhiteTime}
                  loadedBlackTime={loadedBlackTime}
                  isResign={resign}
                />

                <h3 className="text-xl font-bold text-slate-800 mb-3 mt-3">
                  Move History
                </h3>
                <div className="bg-slate-50 rounded-lg p-2 max-h-[500px] overflow-y-auto">
                  {activeGame.history().length === 0 ? (
                    <p className="text-slate-400 text-center">No moves yet</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {activeGame.history().map((move, index) => (
                        <div
                          key={index}
                          className={`bg-white px-3 py-2 rounded shadow-sm cursor-pointer ${
                            index === currentMoveIndex
                              ? "bg-blue-100 font-bold"
                              : "text-slate-700"
                          }`}
                          onClick={() => handleSetReplay(index)}
                        >
                          <span className="font-semibold text-slate-500 text-sm">
                            {Math.floor(index / 2) + 1}.
                          </span>{" "}
                          {move}
                        </div>
                      ))}
                    </div>
                  )}
                  {isGameOver && !abortMessage && (
                    <aside className="mt-1">
                      <span
                        className="flex cursor-pointer"
                        onClick={() =>
                          navigate(`/analysis/game/${gameData.id}`)
                        }
                      >
                        <Search /> Analyze
                      </span>
                    </aside>
                  )}
                  {pgnInfoString?.length > 0 && (
                    <aside className="bg-slate-50 rounded-md border border-slate-60">
                      <h3 className="text-black text-sm font-medium mb-2">
                        PGN File
                      </h3>
                      <Clipboard
                        onClick={() => copyDivContents("PGN_Live")}
                        className="hover:bg-gray-100 cursor-pointer"
                      />
                      <p className="text-black text-s font-mono break-all leading-relaxed PGN_Live">
                        {pgnInfoString}
                      </p>
                    </aside>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-2 bg-slate-200 rounded-lg p-2">
                    <button
                      onClick={goToStart}
                      disabled={currentMoveIndex === -1}
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Jump to start"
                    >
                      <ChevronsLeft size={20} className="text-slate-700" />
                    </button>
                    <button
                      onClick={goToPrevious}
                      disabled={currentMoveIndex < 0}
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous move"
                    >
                      <ChevronLeft size={20} className="text-slate-700" />
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold text-slate-700 min-w-[60px] text-center">
                      {currentMoveIndex + 1} / {activeGame.history().length}
                    </span>
                    <button
                      onClick={goToNext}
                      disabled={
                        currentMoveIndex >= activeGame.history().length - 1
                      }
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next move"
                    >
                      <ChevronRight size={20} className="text-slate-700" />
                    </button>
                    <button
                      onClick={goToEnd}
                      disabled={
                        currentMoveIndex >= activeGame.history().length - 1
                      }
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Jump to end"
                    >
                      <ChevronsRight size={20} className="text-slate-700" />
                    </button>
                  </div>
                </div>
                {(isGameOver || isThreeFoldRepit || resign) &&
                  !abortMessage && (
                    <div className="mt-4 p-4 bg-slate-800 text-white rounded-lg text-center">
                      <p className="font-bold text-lg mb-2">Game Over!</p>
                      <p className="text-slate-300">
                        {isCheckmate &&
                          `${
                            actualGameTurn === "w"
                              ? "Checkmate: Black"
                              : "Checkmate: White"
                          } wins!`}
                        {isThreeFoldRepit && `Draw!! Three Fold Repitition.`}
                        {isFiftyMove && `Draw!! 50 move limit reached.`}
                        {isStalemate && `Draw!! Stalemate.`}
                        {isInsufficient &&
                          `Draw!! Insufficient mating material.`}

                        {resign && `${resign} Resigns!`}
                      </p>
                    </div>
                  )}
                {drawAgreement && (
                  <div className="mt-4 p-4 bg-slate-800 text-white rounded-lg text-center">
                    <p className="text-slate-300">Draw By Aggrement.</p>
                  </div>
                )}
                {(timeOutGameOverReducer(timeOut) == "Black" ||
                  timeOutGameOverReducer(timeOut) == "White") && (
                  <div className="mt-4 p-4 bg-slate-800 text-white rounded-lg text-center">
                    <p className="text-slate-300">
                      {timeOut === "white" ? "Black" : "White"} wins on time!
                    </p>
                  </div>
                )}
                {abortMessage && (
                  <div className="mt-4 p-4 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-center">
                    <p className="font-bold text-lg">{abortMessage}</p>
                    <p className="text-sm mt-1">The game has been cancelled.</p>
                  </div>
                )}
                {finalGameData?.pgn_info?.result}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
