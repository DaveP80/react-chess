// app/components/SignInButtons.tsx
import { Ban, CheckCheck, Handshake } from "lucide-react";
import { processIncomingPgn } from "~/utils/helper";

export default function OfferDraw({ context }) {
  const {
    draw,
    gameData,
    UserContext,
    moveHistory,
    actualTurn,
    orientation,
    supabase,
  } = context;
  const offerDrawArr = draw ? draw.split("$") : [];

  const offerDraw = async () => {
    if (offerDrawArr.length > 0) return;
    try {
      const oppId =
        gameData.pgn_info.white == UserContext?.user.id
          ? gameData.pgn_info.black
          : gameData.pgn_info.white;
      await supabase
        .from(`game_number_${gameData.id}`)
        .update({ draw_offer: oppId })
        .eq("id", gameData.id);
    } catch (error) {
      console.error(error);
    }
  };

  const acceptDraw = async () => {
    if (draw.length == 2) return;
    try {
      const oppId =
        gameData.pgn_info.white == UserContext?.user.id
          ? gameData.pgn_info.black
          : gameData.pgn_info.white;
      await supabase
        .from(`game_number_${gameData.id}`)
        .update({
          pgn_info: {
            ...gameData.pgn_info,
            result: "1/2-1/2",
            termination: "Draw by Agreement",
          },
          draw_offer: draw + "$" + oppId,
        })
        .eq("id", gameData.id);
    } catch (error) {
      console.error(error);
    }
  };

  const declineDraw = async () => {
    try {
      await supabase
        .from(`game_number_${gameData.id}`)
        .update({ draw_offer: null })
        .eq("id", gameData.id);
      //close draw flow
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      { moveHistory.length > 0 &&
        processIncomingPgn(actualTurn, orientation) && (
          <button
            onClick={offerDraw}
            className={`flex items-center gap-2 ${draw ? "bg-green-200 hover:bg-green-300" : "bg-green-300 hover:bg-green-400"} text-gray px-4 py-2 rounded-lg transition-colors`}
          >
            <Handshake />
            Offer Draw
          </button>
        )}
      {offerDrawArr[0] === UserContext?.user.id && (
        <button
          onClick={acceptDraw}
          className="flex items-center gap-2 bg-green-800 hover:bg-green-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <CheckCheck />
          {offerDrawArr.length == 1 && "Accept Draw"}
        </button>
      )}
      {offerDrawArr[0] === UserContext?.user.id && (
        <button
          onClick={declineDraw}
          className="flex items-center gap-2 bg-red-800 hover:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Ban />
          {offerDrawArr.length == 1 && "Decline Draw"}
        </button>
      )}
    </>
  );
}
