import { useEffect, useState, useRef } from "react";
import { Clock } from "lucide-react";

interface ChessClockProps {
  initialTime: number; // in seconds
  increment: number; // in seconds
  currentTurn: "w" | "b";
  isGameOver: boolean;
  onTimeOut: (player: "white" | "black") => void;
  moveCount: number;
  isReplay: boolean;
}

export function ChessClock({
  initialTime,
  increment,
  currentTurn,
  isGameOver,
  onTimeOut,
  moveCount,
  isReplay,
}: ChessClockProps) {
  const [whiteTime, setWhiteTime] = useState(initialTime);
  const [blackTime, setBlackTime] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  const lastMoveCountRef = useRef(moveCount);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset clock when game resets
  useEffect(() => {
    if (moveCount === 0 && lastMoveCountRef.current > 0) {
      setWhiteTime(initialTime);
      setBlackTime(initialTime);
      setIsActive(false);
    }
  }, [moveCount, initialTime]);

  // Start clock on first move, pause during replay or game over
  useEffect(() => {
    if (isReplay || isGameOver) {
      setIsActive(false);
    } else if (moveCount > 0) {
      setIsActive(true);
    }
  }, [moveCount, isReplay, isGameOver]);

  // Handle increment when turn changes
  useEffect(() => {
    if (moveCount > lastMoveCountRef.current && lastMoveCountRef.current > 0) {
      // A move was just made, add increment to the player who just moved
      const previousTurn = currentTurn === "w" ? "b" : "w";
      if (previousTurn === "w") {
        setWhiteTime((prev) => prev + increment);
      } else {
        setBlackTime((prev) => prev + increment);
      }
    }
    lastMoveCountRef.current = moveCount;
  }, [moveCount, currentTurn, increment]);

  // Countdown timer
  useEffect(() => {
    if (!isActive || initialTime === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (currentTurn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 0) {
            setIsActive(false);
            onTimeOut("white");
            return 0;
          }
          return prev - 0.1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 0) {
            setIsActive(false);
            onTimeOut("black");
            return 0;
          }
          return prev - 0.1;
        });
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, currentTurn, onTimeOut, initialTime]);

  const formatTime = (seconds: number): string => {
    if (seconds < 0) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);

    // Show tenths of seconds when under 20 seconds
    if (seconds < 20) {
      return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`;
    }

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = (time: number, isCurrentPlayer: boolean): string => {
    if (time <= 0) return "text-red-600 font-bold";
    if (time < 10) return "text-red-500 font-semibold";
    if (time < 30) return "text-orange-500";
    if (isCurrentPlayer) return "text-slate-800";
    return "text-slate-500";
  };

  // Don't show clock for unlimited games
  if (initialTime === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      {/* Black's clock */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          currentTurn === "b" && isActive && !isGameOver
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock
            size={18}
            className={currentTurn === "b" && isActive ? "text-blue-600" : "text-slate-400"}
          />
          <span className="text-sm font-medium text-slate-600">Black</span>
        </div>
        <span
          className={`text-2xl font-mono tabular-nums ${getTimeColor(
            blackTime,
            currentTurn === "b"
          )}`}
        >
          {formatTime(blackTime)}
        </span>
      </div>

      {/* White's clock */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          currentTurn === "w" && isActive && !isGameOver
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock
            size={18}
            className={currentTurn === "w" && isActive ? "text-blue-600" : "text-slate-400"}
          />
          <span className="text-sm font-medium text-slate-600">White</span>
        </div>
        <span
          className={`text-2xl font-mono tabular-nums ${getTimeColor(
            whiteTime,
            currentTurn === "w"
          )}`}
        >
          {formatTime(whiteTime)}
        </span>
      </div>

      {/* Time control info */}
      {increment > 0 && (
        <div className="text-center text-xs text-slate-500 mt-1">
          {Math.floor(initialTime / 60)}+{increment} format
        </div>
      )}
    </div>
  );
}
