import { EloEstimate } from "~/utils/helper";

export default function RatingInfo({ gameData, winner }) {
  let winner_insert = "";
  switch (winner) {
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
  }
  const [player_w, player_b, expected_w, expected_b] = EloEstimate({
    white_elo: gameData.pgn_info.whiteelo,
    black_elo: gameData.pgn_info.blackelo,
    winner: winner_insert,
    game_counts: [gameData.white_count, gameData.black_count],
  });
  let expected_white = `+${expected_w - gameData.pgn_info.whiteelo}`;
  let expected_black = `+${expected_b - gameData.pgn_info.blackelo}`;
  return (
    <aside className="overflow-auto h-8">
      {gameData.pgn_info.is_rated == "rated" ? 
      <>
      <p>Rating if win: white:{expected_white}</p>
      <p>black:{expected_black}</p>
      {winner_insert && (
        <>
          <p>new white rating: {player_w}</p>
          <p>new black rating: {player_b}</p>
        </>
      )}
      </>
      : <p>Game is Unrated</p>}
    </aside>
  );
}
