import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Clock } from "lucide-react";
import { playSound } from "~/utils/sounds";

interface ChessClockProps {
  initialTime: number; // in seconds
  increment: number; // in seconds
  currentTurn: "w" | "b"; // The actual game turn, not the displayed position
  isGameOver: boolean;
  hasResult: string;
  onTimeOut: (player: "white" | "black" | "game over") => void;
  moveCount: number; // The actual number of moves made in the game
  isResign: boolean | string;
  loadedWhiteTime?: number; // Time to load from database
  loadedBlackTime?: number; // Time to load from database
}

export interface ChessClockHandle {
  getCurrentTimes: () => { whiteTime: number; blackTime: number };
}

const LOW_TIME_THRESHOLD = 60; // seconds

export const ChessClock = forwardRef<ChessClockHandle, ChessClockProps>(({
  initialTime,
  increment,
  currentTurn,
  isGameOver,
  onTimeOut,
  hasResult,
  moveCount,
  loadedWhiteTime,
  loadedBlackTime,
  isResign
}, ref) => {
  const [whiteTime, setWhiteTime] = useState(loadedWhiteTime ?? initialTime);
  const [blackTime, setBlackTime] = useState(loadedBlackTime ?? initialTime);
  const [isActive, setIsActive] = useState(false);
  const lastMoveCountRef = useRef(moveCount);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const whiteTimeRef = useRef(whiteTime);
  const blackTimeRef = useRef(blackTime);
  
  // Track if low-time warning has been played for each player
  const whiteLowTimePlayedRef = useRef(false);
  const blackLowTimePlayedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    whiteTimeRef.current = whiteTime;
  }, [whiteTime]);

  useEffect(() => {
    blackTimeRef.current = blackTime;
  }, [blackTime]);

  // Expose method to get current times
  useImperativeHandle(ref, () => ({
    getCurrentTimes: () => ({
      whiteTime: whiteTimeRef.current,
      blackTime: blackTimeRef.current,
    }),
  }));

  // Sync with loaded time values (for persistence and websocket updates)
  useEffect(() => {
    if (loadedWhiteTime !== undefined && loadedWhiteTime !== whiteTime) {
      setWhiteTime(loadedWhiteTime);
    }
  }, [loadedWhiteTime]);

  useEffect(() => {
    if (loadedBlackTime !== undefined && loadedBlackTime !== blackTime) {
      setBlackTime(loadedBlackTime);
    }
  }, [loadedBlackTime]);

  // Reset clock when game resets
  useEffect(() => {
    if (moveCount === 0 && lastMoveCountRef.current > 0) {
      setWhiteTime(initialTime);
      setBlackTime(initialTime);
      setIsActive(false);
      // Reset low-time warning flags for new game
      whiteLowTimePlayedRef.current = false;
      blackLowTimePlayedRef.current = false;
    }
  }, [moveCount, initialTime]);

  // Start clock on first move, pause only on game over
  useEffect(() => {
    if (isGameOver || isResign || hasResult) {
      setIsActive(false);
    } else if (moveCount > 0) {
      setIsActive(true);
    }
  }, [moveCount, isGameOver, hasResult, isResign]);

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

  // Check for low time and play warning sound
  useEffect(() => {
    if (!isActive || isGameOver || hasResult || isResign) return;

    // Check white's time
    if (
      whiteTime < LOW_TIME_THRESHOLD && 
      whiteTime > 0 && 
      !whiteLowTimePlayedRef.current &&
      currentTurn === "w"
    ) {
      playSound('lowTime');
      whiteLowTimePlayedRef.current = true;
    }

    // Check black's time
    if (
      blackTime < LOW_TIME_THRESHOLD && 
      blackTime > 0 && 
      !blackLowTimePlayedRef.current &&
      currentTurn === "b"
    ) {
      playSound('lowTime');
      blackLowTimePlayedRef.current = true;
    }
  }, [whiteTime, blackTime, currentTurn, isActive, isGameOver, hasResult, isResign]);

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
          if (isGameOver || isResign || hasResult) {
            setIsActive(false);
            onTimeOut("game over");
            return 0;
          }
          else if (prev <= 0) {
            setIsActive(false);
            onTimeOut("white");
            return 0;
          }
          return prev - 0.1;
        });
      } else {
        setBlackTime((prev) => {
          if (isGameOver || isResign || hasResult) {
            setIsActive(false);
            onTimeOut("game over");
            return 0;
          }
          else if (prev <= 0) {
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
    if (time < LOW_TIME_THRESHOLD) return "text-yellow-600"; // Added visual indicator for low time
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
            ? blackTime < LOW_TIME_THRESHOLD
              ? "border-red-500 bg-red-50" // Red border when low on time
              : "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock
            size={18}
            className={currentTurn === "b" && isActive ? "text-blue-600" : "text-slate-400"}
          />
          <span className="text-sm font-medium text-slate-600">Black</span>
          {blackTime < LOW_TIME_THRESHOLD && blackTime > 0 && (
            <span className="text-xs text-red-500 font-semibold animate-pulse">LOW TIME</span>
          )}
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
            ? whiteTime < LOW_TIME_THRESHOLD
              ? "border-red-500 bg-red-50" // Red border when low on time
              : "border-blue-500 bg-blue-50"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock
            size={18}
            className={currentTurn === "w" && isActive ? "text-blue-600" : "text-slate-400"}
          />
          <span className="text-sm font-medium text-slate-600">White</span>
          {whiteTime < LOW_TIME_THRESHOLD && whiteTime > 0 && (
            <span className="text-xs text-red-500 font-semibold animate-pulse">LOW TIME</span>
          )}
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
});

ChessClock.displayName = "ChessClock";