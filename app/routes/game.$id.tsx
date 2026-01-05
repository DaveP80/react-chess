import { useContext, useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  RotateCcw,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FlagIcon,
} from "lucide-react";
import {
  checkIfRepetition,
  timeControlReducer,
  parseTimeControl,
  processIncomingPgn,
  SUPABASE_CONFIG,
} from "~/utils/helper";
import { GlobalContext } from "~/context/globalcontext";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import { useLoaderData, useRouteLoaderData } from "@remix-run/react";
import { ChessClock } from "~/components/ChessClock";
import { getSupabaseBrowserClient } from "~/utils/supabase.client";
import { inserNewMoves } from "~/utils/supabase.gameplay";
import { createBrowserClient } from "@supabase/ssr";

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
    const { data, error } = await client.rpc("lookup_userdata_on_gameid", {
      game_id_f: gameId,
    });

    if (error) {
      return Response.json({ error }, { headers });
    } else {
      return Response.json(
        {
          go: true,
          message: `retrieved game data on id: ${gameId}`,
          data: data[0],
          userData: userData?.claims.sub,
        },
        { headers }
      );
    }
  } catch (error) {
    const headers = new Headers();
    return Response.json({ error }, { headers });
  }
}

export default function Index() {
  const [isReplay, setIsReplay] = useState<null | number>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [resign, setResign] = useState(false);
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
  const [gameConfig, setGameConfig] = useState({timeControl: "unlimited", colorPreference: "white" });
  const { activeGame, setActiveGame } = useContext(GlobalContext);
  const { fenHistory, setFenHistory } = useContext(GlobalContext);
  const { moveHistory, setMoveHistory } = useContext(GlobalContext);
  const { data: gameData } = useLoaderData<typeof loader>();
  const [game_length, timeControl] = timeControlReducer(
    gameConfig?.timeControl || ""
  );
  const [initialTime, increment] = parseTimeControl(
    gameConfig?.timeControl || "unlimited"
  );
  const [timeOut, setTimeOut] = useState<"white" | "black" | null>(null);
  const [gameStart, setGameStart] = useState<boolean>(false);
  const supabase = getSupabaseBrowserClient(true);
  const supabase2 = createBrowserClient(SUPABASE_CONFIG[0], SUPABASE_CONFIG[1], SUPABASE_CONFIG[2]);

  
  useEffect(() => {
    let channel = null;
    if (gameData) {
      setToggleUsers({
        ...toggleUsers,
        toggle: true,
        orientation:
        gameData.white_username == UserContext?.rowData.username ? "white" : "black",
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
    };
    
    return () => {
    };
  }, [gameData]);
  
  
  useEffect(() => {
    setGameConfig({...gameConfig, ...(JSON.parse(window.localStorage.getItem("pairing_info") || "{}"))});
    const channel = supabase2
    .channel("realtime-messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: `game_number_${gameData?.id || "0"}` },
      async (payload: { eventType: string; }) => {
        if (payload.eventType === "UPDATE") {
          try {
            const {data, error} = await supabase.from(`game_number_${gameData?.id || "0"}`).select("pgn").eq("id", gameData.id);
            if (data) {
              const newMovePgn = data[0].pgn;
              const arrayLength = newMovePgn.length;
              if (arrayLength > 0) {
                if (gameData && toggleUsers.oppUsername) {
                  let localOrientation =  gameData.white_username == UserContext?.rowData.username ? "white" : "black";
                  const actualGame =
                  fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : new Chess();
                  const actualTurn = actualGame.turn();
                  if (!processIncomingPgn(actualTurn, localOrientation)) {
                    setActiveGame(newMovePgn[newMovePgn.length-1].split("$")[0]);
                    //setMoveHistory([...moveHistory, newMovePgn[newMovePgn.length-1].split("$")[1]]);
                    setMoveHistory(newMovePgn.map((item: string) => item.split("$")[1]));
                    //setFenHistory([...fenHistory, new Chess(newMovePgn[newMovePgn.length-1].split("$")[0])]);
                    setFenHistory(newMovePgn.map((item: string) => new Chess(item.split("$")[0])));
                    setCurrentMoveIndex(moveHistory.length-1);
                    
                    
                  }
                  
                }
                
              }
              
            }
            
            
          } catch (error) {
            console.error(error);
          }
          
          
        }
      }
    )
    .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    }
  }, [])

  
  
  
  async function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      const actualGame =
      fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : new Chess();
      const actualTurn = actualGame.turn();
      if (!isReplay && !resign && !checkIfRepetition(fenHistory) && processIncomingPgn(actualTurn, toggleUsers.orientation)) {
        const gameCopy = new Chess(activeGame.fen());
        console.log(typeof gameCopy)
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

        if (move === null) return false;
        setActiveGame(gameCopy);
        setMoveHistory([...moveHistory, move.san]);
        setFenHistory([...fenHistory, gameCopy]);
        setCurrentMoveIndex(moveHistory.length - 1);
        await inserNewMoves(supabase, gameCopy.fen(), move.san, gameData.id);
        
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  function resetGame() {
    setActiveGame(new Chess());
    setMoveHistory([]);
    setFenHistory([]);
    setCurrentMoveIndex(-1);
    setResign(false);
    setTimeOut(null);
  }

  function handleTimeOut(player: "white" | "black") {
    setTimeOut(player);
  }
  function resignGame() {
    // Check the actual game state, not the displayed position
    const actualGame =
      fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : new Chess();

    if (actualGame.isGameOver()) {
      return null;
    }
    if (checkIfRepetition(fenHistory)) {
      return null;
    }
    if (!resign && moveHistory.length > 0) {
      setResign(true);
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

  // Get the actual game state (from the real current position, not the displayed position during replay)
  const actualGame =
    fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : new Chess();

  // Game over state is based on the actual game, not the displayed position
  const isGameOver = actualGame.isGameOver() || timeOut !== null;

  // Display indicators are based on what's currently shown on the board
  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isCheck = activeGame.isCheck();
  const isThreeFoldRepit = checkIfRepetition(fenHistory);

  // Get the actual game turn
  const actualGameTurn = actualGame.turn();
  console.log(actualGameTurn)

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
                    onClick={resetGame}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <RotateCcw size={20} />
                    New Game
                  </button>
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
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  Game Info
                </h2>

                {/* Chess Clock */}
                <ChessClock
                  initialTime={initialTime}
                  increment={increment}
                  currentTurn={actualGameTurn}
                  isGameOver={isGameOver}
                  onTimeOut={handleTimeOut}
                  moveCount={moveHistory.length}
                />

                <h3 className="text-xl font-bold text-slate-800 mb-4 mt-6">
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
                  <div className="mt-4 flex items-center justify-center gap-2 bg-slate-200 rounded-lg p-2">
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
                      {timeOut
                        ? `${
                            timeOut === "white" ? "Black" : "White"
                          } wins on time!`
                        : actualGame.isCheckmate() && !resign
                        ? `${actualGameTurn === "w" ? "Black" : "White"} wins!`
                        : !resign
                        ? "The game is a draw."
                        : ""}
                    </p>
                    <p className="text-slate-300">
                      {actualGameTurn === "w" && resign && "White Resigns!"}
                      {actualGameTurn === "b" && resign && "Black Resigns!"}
                    </p>
                    <p className="text-slate-300">
                      {isThreeFoldRepit &&
                        !resign &&
                        !timeOut &&
                        `Draw!! Three Fold Repitition.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
