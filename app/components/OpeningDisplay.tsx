// app/components/OpeningDisplay.tsx
import { useFetcher } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { BookOpen } from "lucide-react";
import { Opening } from "~/types";

interface OpeningDisplayProps {
  fenHistoryWithStart: string[];
  setCurrentOpening: React.Dispatch<React.SetStateAction<Opening | null>>;
  currentOpening: Opening | null;
}

export function OpeningDisplay({
  fenHistoryWithStart,
  setCurrentOpening,
  currentOpening,
}: OpeningDisplayProps) {
  const fetcher = useFetcher<{ opening: Opening | null }>();
  const fenKey = fenHistoryWithStart.join(",");
  // Track if we've exited the opening book (no more lookups needed)
  const openingPhaseEndedRef = useRef(false);
  // Track the last FEN length when we found an opening
  const lastOpeningFenLengthRef = useRef(0);

  useEffect(() => {
    if (
      openingPhaseEndedRef.current ||
      fetcher.state !== "idle" ||
      fenHistoryWithStart.length < 1
    ) {
      return;
    }
    if (fenHistoryWithStart.length >= 1 && fetcher.state === "idle") {
      fetcher.load(
        `/api/opening?fen=${encodeURIComponent(fenHistoryWithStart.join(","))}`,
      );
    }
  }, [fenKey]);

  useEffect(() => {
    if (fetcher.data?.opening) {
      setCurrentOpening(fetcher.data.opening);
      if (fetcher.data.opening.idx == lastOpeningFenLengthRef.current) {
        openingPhaseEndedRef.current = true;
      }
      lastOpeningFenLengthRef.current = fetcher.data?.opening.idx;
    } else if (!fetcher.data?.opening) {
      setCurrentOpening({ moves: "", eco: "", name: "", idx: 0 });
      openingPhaseEndedRef.current = true;
    }
    // Keep showing last known opening if current position isn't in book
  }, [fetcher.data, setCurrentOpening]);

  useEffect(() => {
    if (fenHistoryWithStart.length <= 1) {
      openingPhaseEndedRef.current = false;
      lastOpeningFenLengthRef.current = 0;
    }
  }, [fenHistoryWithStart.length]);

  if (!currentOpening || currentOpening?.eco === "") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg">
      <BookOpen size={16} className="text-amber-400 flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-amber-400 font-mono text-xs mr-2">
          {currentOpening.eco}
        </span>
        <span className="text-slate-200 text-sm truncate text-wrap">
          {currentOpening.name}
        </span>
      </div>
    </div>
  );
}
