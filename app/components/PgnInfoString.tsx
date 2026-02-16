import React, { useEffect, useState } from "react";
import {
  copyDivContents,
  makePGNInfoString,
} from "~/utils/helper";
import { Clipboard } from "lucide-react";

export default function PgnInfoString({
  finalGameData,
  currentOpening,
}) {
  const [pgnInfoString, setpgnInfoString] = useState<string>("");



  useEffect(() => {
    if (finalGameData?.pgn_info?.result && currentOpening) {
      makePGNInfoString(finalGameData, setpgnInfoString, currentOpening.eco);
    }

    return () => {
      true;
    };
  }, [finalGameData, currentOpening]);

  if (!pgnInfoString) {
    return null;
  }

  return (
    <aside className="bg-slate-50 rounded-md border border-slate-60">
      <h3 className="text-black text-sm font-medium mb-2">PGN File</h3>
      <Clipboard
        onClick={() => copyDivContents("PGN_Live")}
        className="hover:bg-gray-100 cursor-pointer"
      />
      <p className="text-black text-s font-mono break-all leading-relaxed PGN_Live">
        {pgnInfoString}
      </p>
    </aside>
  );
}
