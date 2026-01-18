import { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FlagIcon,
} from "lucide-react";
import {
  checkIfRepetition,
  timeControlReducer,
  parsePgnEntry,
  setFenHistoryHelper,
} from "~/utils/helper";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { lookup_analysis_userdata_on_gameid } from "~/utils/apicalls.server";
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
    //returns userdata and the current game data.
    const response = await lookup_analysis_userdata_on_gameid(
      client,
      headers,
      Number(gameId),
      userData
    );
    return response;
  } catch (error) {
    const headers = new Headers();
    return Response.json({ error }, { headers });
  }
}

export default function Index() {
  const [isReplay, setIsReplay] = useState<null | number>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [resign, setResign] = useState<boolean | string>(false);
  const UserContext = useRouteLoaderData<typeof loader>("root");
  const [toggleUsers, setToggleUsers] = useState({
    toggle: false,
    orientation: "white",
    oppUsername: "",
    myUsername: UserContext?.user?.username,
    oppAvatarURL: "",
    myAvatarURL: UserContext?.user?.avatarUrl,
    gameTimeLength: "",
    oppElo: 1500,
    myElo: 1500,
  });
  const [gameConfig, setGameConfig] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("pairing_info");
      if (stored) {
        return JSON.parse(stored);
      }
    }
    return {
      timeControl: "unlimited",
      colorPreference: "white",
    };
  });

  const [activeGame, setActiveGame] = useState(new Chess());
  const [fenHistory, setFenHistory] = useState<(typeof Chess)[] | any[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [draw, setDraw] = useState("");
  const [result, setResult] = useState<Record<string, string>>({
    result: "",
    termination: "",
  });
  const { data: gameData } = useLoaderData<typeof loader>();
  const [game_length, timeControl] = timeControlReducer(
    gameConfig?.timeControl || ""
  );


  useEffect(() => {
    if (gameData) {
      setToggleUsers({
        ...toggleUsers,
        toggle: true,
        orientation:
          gameData.white_username == UserContext?.rowData.username
            ? "white"
            : "black",
        oppUsername:
          gameData.white_username == UserContext?.rowData.username
            ? gameData.black_username
            : gameData.white_username,
        myUsername: UserContext?.rowData.username,
        oppAvatarURL:
          gameData.white_avatar == UserContext?.rowData.avatarURL
            ? gameData.black_avatar
            : gameData.white_avatar,
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

        setActiveGame(new Chess(lastEntry.fen));
        setMoveHistory(
          currGamePgn.map((item: string) => parsePgnEntry(item).move)
        );
        setFenHistory(
          currGamePgn.map((item: string) => new Chess(parsePgnEntry(item).fen))
        );
        setCurrentMoveIndex(moveHistory.length - 1);

        // Set clock times from the last move if available
      }
      if (gameData.pgn_info.result) {
        setResult({
          result: gameData.pgn_info.result,
          termination: gameData.pgn_info.termination,
        });
        const endGameData = gameData.pgn_info;
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


  async function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      const actualGame =
        fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : new Chess();
      const actualTurn = actualGame.turn();
      if (
        !isReplay &&
        !resign &&
        !checkIfRepetition(fenHistory) &&
        !result.result
      ) {
        const gameCopy = new Chess(activeGame.fen());
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (move === null) return false;
        const [fha, fhb, mhc] = setFenHistoryHelper(
          gameCopy,
          fenHistory,
          move.san,
          moveHistory
        );
        if (fha) {
          setActiveGame(gameCopy);
          setMoveHistory(mhc);
          setFenHistory(fhb);
          setCurrentMoveIndex(moveHistory.length - 1);



          return true;
        } else {
          return false;
        }
      }
    } catch (error) {
      return false;
    }
  }

  const handleSetReplay = (idx: number) => {
    if (idx != fenHistory.length - 1) {
      setActiveGame(fenHistory[idx]);
      setIsReplay(idx);
      setCurrentMoveIndex(idx);
    }
    if (idx == fenHistory.length - 1) {
      setIsReplay(null);
      setActiveGame(fenHistory[fenHistory.length - 1]);
      setCurrentMoveIndex(fenHistory.length - 1);
    }
  };

  const goToStart = () => {
    if (fenHistory.length > 0) {
      setActiveGame(new Chess());
      setIsReplay(-1);
      setCurrentMoveIndex(-1);
    }
  };

  const goToEnd = () => {
    if (fenHistory.length > 0) {
      const lastIndex = fenHistory.length - 1;
      setActiveGame(fenHistory[lastIndex]);
      setIsReplay(null);
      setCurrentMoveIndex(lastIndex);
    }
  };

  const goToPrevious = () => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      setActiveGame(fenHistory[newIndex]);
      setIsReplay(newIndex);
      setCurrentMoveIndex(newIndex);
    }
  };

  const goToNext = () => {
    if (currentMoveIndex < fenHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      setActiveGame(fenHistory[newIndex]);
      if (newIndex === fenHistory.length - 1) {
        setIsReplay(null);
      } else {
        setIsReplay(newIndex);
      }
      setCurrentMoveIndex(newIndex);
    }
  };


  // Check for threefold repetition
  const isThreeFoldRepit = checkIfRepetition(fenHistory);
  // Game over state is based on ALL game-ending conditions
  const isGameOver =
    activeGame.isGameOver() ||
    isThreeFoldRepit 

  // Display indicators are based on what's currently shown on the board
  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isCheck = activeGame.isCheck();
  const isStalemate = activeGame.isStalemate();
  const isFiftyMove = activeGame.isDrawByFiftyMoves();
  const isInsufficient = activeGame.isInsufficientMaterial();

  const actualGameTurn = activeGame.turn();
  const drawAgreement =
    result?.termination && result.termination.includes("Agreement")
      ? true
      : false;
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

                  <button
                    onClick={resignGame}
                    className="flex items-center gap-2 bg-red-900 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <FlagIcon size={20} />
                    Resign
                  </button>

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
                  position={activeGame.fen()}
                  onPieceDrop={onDrop}
                  boardWidth={Math.min(
                    600,
                    typeof window !== "undefined" ? window.innerWidth - 48 : 600
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
                <RatingInfo gameData={gameData} winner={result?.result || ""} />
                <h3 className="text-xl font-bold text-slate-800 mb-3 mt-3">
                  Move History
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                  {moveHistory.length === 0 ? (
                    <p className="text-slate-400 text-center">No moves yet</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {moveHistory.map((move, index) => (
                        <div
                          key={index}
                          className={`bg-white px-3 py-2 rounded shadow-sm ${
                            index == isReplay
                              ? "text-red-500"
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

                  <div className="mt-3 flex items-center justify-center gap-2 bg-slate-200 rounded-lg p-2">
                    <button
                      onClick={goToStart}
                      disabled={currentMoveIndex === 0}
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Jump to start"
                    >
                      <ChevronsLeft size={20} className="text-slate-700" />
                    </button>
                    <button
                      onClick={goToPrevious}
                      disabled={currentMoveIndex <= 0}
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous move"
                    >
                      <ChevronLeft size={20} className="text-slate-700" />
                    </button>
                    <span className="px-3 py-1 text-sm font-semibold text-slate-700 min-w-[60px] text-center">
                      {currentMoveIndex + 1} / {moveHistory.length}
                    </span>
                    <button
                      onClick={goToNext}
                      disabled={currentMoveIndex >= fenHistory.length - 1}
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next move"
                    >
                      <ChevronRight size={20} className="text-slate-700" />
                    </button>
                    <button
                      onClick={goToEnd}
                      disabled={currentMoveIndex >= fenHistory.length - 1}
                      className="p-2 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Jump to end"
                    >
                      <ChevronsRight size={20} className="text-slate-700" />
                    </button>
                  </div>
                </div>
                {(isGameOver || isThreeFoldRepit || resign) && (
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
                      {isInsufficient && `Draw!! Insufficient mating material.`}

                      {resign && `${resign} Resigns!`}
                    </p>
                  </div>
                )}
                {drawAgreement && (
                  <div className="mt-4 p-4 bg-slate-800 text-white rounded-lg text-center">
                    <p className="text-slate-300">Draw By Aggrement.</p>
                  </div>
                )}
                {result.result}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
