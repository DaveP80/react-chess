import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { MetaFunction } from '@remix-run/node';
import { RotateCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FlagIcon } from 'lucide-react';
import {checkIfRepetition} from "~/utils/helper";

export const meta: MetaFunction = () => {
  return [
    { title: 'Chess Game - Play Online' },
    { name: 'description', content: 'Interactive chess game built with Remix and react-chessboard' },
  ];
};

export default function Index() {
  const [game, setGame] = useState(new Chess());
  const [fenHistory, setFenHistory] = useState<any[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isReplay, setIsReplay] = useState<null | number>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [resign, setResign] = useState(false);

  function onDrop(sourceSquare: string, targetSquare: string) {
    try {
      if (!isReplay && !resign && !checkIfRepetition(fenHistory)) {

        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });
        

        if (move === null) return false;
        setGame(gameCopy);
        setMoveHistory([...moveHistory, move.san]);
        setFenHistory([...fenHistory, gameCopy]);
        setCurrentMoveIndex(moveHistory.length-1);

        return true;
      }


    } catch (error) {
      return false;
    }
  }

  function resetGame() {
    setGame(new Chess());
    setMoveHistory([]);
    setFenHistory([]);
    setCurrentMoveIndex(-1);
    setResign(false);
  }
  function resignGame() {
    if (game.isGameOver()) {
      return null;
    };
    if (checkIfRepetition(fenHistory)){
      return null;
    }
    if (!resign && moveHistory.length > 0) {
      setResign(true);
    }
  }

  const handleSetReplay = (idx: number) => {
    if (idx != fenHistory.length-1) {
      setGame(fenHistory[idx]);
      setIsReplay(idx);
      setCurrentMoveIndex(idx);
    }
    if (idx == fenHistory.length -1) {
      setIsReplay(null);
      setGame(fenHistory[fenHistory.length-1]);
      setCurrentMoveIndex(fenHistory.length-1);
    }
  }

  const goToStart = () => {
    if (fenHistory.length > 0) {
      setGame(new Chess());
      setIsReplay(-1);
      setCurrentMoveIndex(-1);
    }
  };

  const goToEnd = () => {
    if (fenHistory.length > 0) {
      const lastIndex = fenHistory.length - 1;
      setGame(fenHistory[lastIndex]);
      setIsReplay(null);
      setCurrentMoveIndex(lastIndex);
    }
  };

  const goToPrevious = () => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      setGame(fenHistory[newIndex]);
      setIsReplay(newIndex);
      setCurrentMoveIndex(newIndex);
    }
  };

  const goToNext = () => {
    if (currentMoveIndex < fenHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      setGame(fenHistory[newIndex]);
      if (newIndex === fenHistory.length - 1) {
        setIsReplay(null);
      } else {
        setIsReplay(newIndex);
      }
      setCurrentMoveIndex(newIndex);
    }
  };




  const isGameOver = game.isGameOver();
  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const isCheck = game.isCheck();
  const isThreeFoldRepit = checkIfRepetition(fenHistory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white mb-3">
              Chess Game
            </h1>
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
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardWidth={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 48 : 600)}
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  Move History
                </h2>
                <div className="bg-slate-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                  {moveHistory.length === 0 ? (
                    <p className="text-slate-400 text-center">
                      No moves yet
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {moveHistory.map((move, index) => (
                        <div
                          key={index}
                          className={`bg-white px-3 py-2 rounded shadow-sm ${index == isReplay ? 'text-red-500' : 'text-slate-700'}`}
                          onClick={() => handleSetReplay(index)}
                        >
                          <span className="font-semibold text-slate-500 text-sm">
                            {Math.floor(index / 2) + 1}.
                          </span>{' '}
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
                      {isCheckmate && !resign
                        ? `${game.turn() === 'w' ? 'Black' : 'White'} wins!`
                        : (!resign ? "The game is a draw." : "")}
                    </p>
                    <p className="text-slate-300">
                      {game.turn() === 'w' && resign && "White Resigns!"}
                      {game.turn() === 'b' && resign && "Black Resigns!"}
                    </p>
                    <p className="text-slate-300">
                      {isThreeFoldRepit && !resign && (
                        `Draw!! Three Fold Repitition.`
                      )}
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
