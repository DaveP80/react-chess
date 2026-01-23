import { EloRank } from "~/utils/elo";
import { Chess } from "chess.js";
export function checkIfRepetition(positions) {
  const counts = new Map();

  for (const pos of positions) {
    let ss = pos.fen().indexOf("-");
    let subFEN = pos.fen().substring(0, ss - 1);
    const c = (counts.get(subFEN) ?? 0) + 1;
    if (c === 3) return true;
    counts.set(subFEN, c);
  }

  return false;
}

export function isValidUsername(username) {
  // length check
  if (username.length < 4 || username.length > 20) {
    return false;
  }

  // only a-z, A-Z, 0-9, _
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return false;
  }

  // no leading or trailing underscore
  if (username.startsWith("_") || username.endsWith("_")) {
    return false;
  }

  // no consecutive underscores
  if (username.includes("__")) {
    return false;
  }

  if (
    ["undefined", "null", "NULL", "None"].some(
      (item) => username.toLowerCase() == item.toLowerCase()
    )
  ) {
    return false;
  }

  return true;
}

export function isValidAvatarURL(avatarURL) {
  if (avatarURL.length < 7) return false;
  let check = [".jpg", ".jpeg", ".png", ".svg"].some((item) =>
    avatarURL.toLowerCase().endsWith(item)
  );
  return check;
}

export function timeControlReducer(timeControl) {
  let game_length = null;
  let ratingType = null;

  // Extract base time (before the + if it exists)
  const baseTime = timeControl.split("+")[0];

  switch (baseTime) {
    case "3": {
      ratingType = "blitz_rating";
      game_length = timeControl; // Keep full format like "3+2"
      break;
    }
    case "5": {
      ratingType = "blitz_rating";
      game_length = timeControl;
      break;
    }
    case "10": {
      ratingType = "rapid_rating";
      game_length = timeControl;
      break;
    }
    case "unlimited": {
      ratingType = "rapid_rating";
      game_length = "unlimited";
      break;
    }
    default: {
      ratingType = "rapid_rating";
      game_length = timeControl;
    }
  }

  return [game_length, ratingType];
}

/**
 * Parse time control string and return initial time and increment in seconds
 * @param {string} timeControl - Format: "3+2" (3 minutes + 2 second increment) or "unlimited"
 * @returns {[number, number]} - [initialTimeInSeconds, incrementInSeconds]
 */
export function parseTimeControl(timeControl) {
  if (timeControl === "unlimited") {
    return [0, 0]; // 0 means unlimited
  }

  const parts = timeControl.split("+");
  const minutes = parseInt(parts[0], 10);
  const increment = parts.length > 1 ? parseInt(parts[1], 10) : 0;

  const initialTimeInSeconds = minutes * 60;

  return [initialTimeInSeconds, increment];
}

export function processIncomingPgn(gameTurn, orientation) {
  if (gameTurn == "w" && orientation == "white") {
    return true;
  }
  if (gameTurn == "b" && orientation == "black") {
    return true;
  }
  return false;
}

/**
 * Parse a PGN entry that may include time data
 * @param {string} pgnEntry - Format: "fen$move$timestamp" or "fen$move$timestamp$whiteTime$blackTime"
 * @returns {object} - {fen, move, timestamp, whiteTime, blackTime}
 */
export function parsePgnEntry(pgnEntry) {
  const parts = pgnEntry.split("$");
  return {
    from: parts[0] || "",
    to: parts[1] || "",
    timestamp: parts[2] || "",
    whiteTime: parts[3] ? parseFloat(parts[3]) : null,
    blackTime: parts[4] ? parseFloat(parts[4]) : null,
  };
}

export function setFenHistoryHelper(
  gameCopy,
  newMove,
  move_san,
  moveHistory
) {
  const fenHistory = activeGame.history({verbose: true}).map((item) => item.after);
  if (!gameCopy.history().length) {
    return [true, [gameCopy], [move_san]];
  }

  if (newMove.fen() === gameCopy.fen()) {
    return [false, fenHistory, moveHistory];
  } else {
    return [true, [...fenHistory, gameCopy], [...moveHistory, move_san]];
  }
}

export function timeOutGameOverReducer(args) {
  let r = null;
  switch (args) {
    case "white": {
      r = "Black";
      break;
    }
    case "black": {
      r = "White";
      break;
    }
    case "game over": {
      r = null;
      break;
    }
    default:
      "pass";
  }
  return r;
}

export function gameStartFinishReducer(
  activeGame,
  timeOut,
  gameData,
  resign
) {
  // const actualGame =
  //   fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : null;
  if (!activeGame?.history()?.length) return [null, null];

  // Check for threefold repetition
  const isThreeFoldRepit = activeGame.isThreefoldRepetition();
  // Display indicators are based on what's currently shown on the board
  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isStalemate = activeGame.isStalemate();
  const isFiftyMove = activeGame.isDrawByFiftyMoves();
  const isInsufficient = activeGame.isInsufficientMaterial();
  const actualGameTurn = activeGame.turn();
  let result = "1/2-1/2";
  let termination = "";
  switch (actualGameTurn) {
    case "w": {
      if (isCheckmate) {
        result = "0-1";
        termination = `${gameData.black_username} won by checkmate`;
      } else if (isThreeFoldRepit || isDraw) {
        result = "1/2-1/2";
        if (isThreeFoldRepit) {
          termination = "Three Fold repetition.";
        } else if (isStalemate) {
          termination = "Draw stalemate.";
        } else if (isFiftyMove) {
          termination = "Draw fifty move rule.";
        } else if (isInsufficient) {
          termination = "Draw insufficient mating material.";
        }
      } else if (timeOut == "white" || timeOut == "black") {
        if (timeOut == "white") {
          result = "0-1";
          termination = `${gameData.black_username} won on time`;
        }
        if (timeOut == "black") {
          result = "1-0";
          termination = `${gameData.white_username} won on time`;
        }
      } else if (resign) {
        if (resign == "white") {
          result = "0-1";
          termination = `${gameData.black_username} won by resignation`;
        } else if (resign == "black") {
          result = "1-0";
          termination = `${gameData.white_username} won by resignation`;
        }
      } else {
        result = null;
        termination = null;
      }
      break;
    }
    case "b": {
      if (isCheckmate) {
        result = "1-0";
        termination = `${gameData.white_username} won by checkmate`;
      } else if (isThreeFoldRepit || isDraw) {
        result = "1/2-1/2";
        if (isThreeFoldRepit) {
          termination = "Three Fold repetition; Draw.";
        } else if (isStalemate) {
          termination = "Draw stalemate.";
        } else if (isFiftyMove) {
          termination = "Draw fifty move rule.";
        } else if (isInsufficient) {
          termination = "Draw insufficient mating material.";
        }
      } else if (timeOut == "white" || timeOut == "black") {
        if (timeOut == "white") {
          result = "0-1";
          termination = `${gameData.black_username} won on time`;
        }
        if (timeOut == "black") {
          result = "1-0";
          termination = `${gameData.white_username} won on time`;
        }
      } else if (resign) {
        if (resign == "white") {
          result = "0-1";
          termination = `${gameData.black_username} won by resignation`;
        } else {
          result = "1-0";
          termination = `${gameData.white_username} won by resignation`;
        }
      } else {
        result = null;
        termination = null;
      }
      break;
    }
    default: {
      result = null;
      termination = null;
    }
  }
  return [result, termination];
}
/**
 *
 * @param {data: {white_elo: number, black_elo: number, winner: 'white' | 'black', game_counts: number[]}}
 */

export function EloEstimate(endGameData) {
  //create object with K-Factor(without it defaults to 32)
  //TODO: make dynamic elo based on game_counts -> k factor.
  let elo = new EloRank(endGameData.game_counts[0] > 25 ? 32 : 15);
  let elo_b = new EloRank(endGameData.game_counts[1] > 25 ? 32 : 15);

  //white_elo
  let playerA = endGameData.white_elo;
  //black_elo
  let playerB = endGameData.black_elo;

  //Gets expected score for first parameter
  let expectedScoreA = elo.getExpected(playerA, playerB);
  let expectedScoreB = elo_b.getExpected(playerB, playerA);

  let primaryExpectedA = elo.updateRating(expectedScoreA, 1, playerA);
  let primaryExpectedB = elo_b.updateRating(expectedScoreB, 1, playerB);

  switch (endGameData.winner) {
    case "white": {
      //update score, 1 if won 0 if lost
      playerA = primaryExpectedA;
      playerB = elo_b.updateRating(expectedScoreB, 0, playerB);
      break;
    }
    case "black": {
      playerA = elo.updateRating(expectedScoreA, 0, playerA);
      playerB = primaryExpectedB;
      break;
    }
    case "draw": {
      playerA = elo.updateRating(expectedScoreA, 0.5, playerA);
      playerB = elo_b.updateRating(expectedScoreB, 0.5, playerB);
    }
  }

  //Return winner, and the rating from the game outcome. last 2 items are the projected elo if victory.
  return [playerA, playerB, primaryExpectedA, primaryExpectedB];
}

export function profileWonLossOrient(Data, user) {
  let orientation = "";
  if (Data.white_id == user?.id) {
    orientation = "white";
  } else {
    orientation = "black";
  }
  return orientation;
}

export function memberWonLossOrient(Data, username) {
  let orientation = "";
  if (Data.white_username == username) {
    orientation = "white";
  } else {
    orientation = "black";
  }
  return orientation;
}

export function makePGNInfoString(gameData, setpgnInfoString) {
  const tempGame = new Chess();
  const moveArr = gameData.pgn;
  tempGame.setHeader(
    "Event", `${gameData.pgn_info.is_rated == "rated" ? "Rated Game" : "Unrated Game"}`);
  tempGame.setHeader(
    "Site", "Online");
  tempGame.setHeader(
    "Date", new Date(gameData.pgn_info.date).toDateString());
  tempGame.setHeader(
    "Round", "1");
  tempGame.setHeader(
    "White", gameData.white_username);
  tempGame.setHeader(
    "Black", gameData.black_username);
  tempGame.setHeader(
    "Result", gameData.pgn_info.result);
  tempGame.setHeader(
    "Termination", gameData.pgn_info.termination);
  tempGame.setHeader(
    "WhiteElo", gameData.pgn_info.whiteelo);
  tempGame.setHeader(
    "BlackElo", gameData.pgn_info.blackelo);
  tempGame.setHeader(
    "EndTime", gameData.pgn[gameData.pgn.length - 1].split("$")[2]);
  moveArr.forEach((pgnEntry, index) => {
      const parsed = parsePgnEntry(pgnEntry);
      tempGame.move({
        from: parsed.from,
        to: parsed.to,
        promotion: 'q',
      });
    });
    const gamePGNFile = tempGame.pgn();
    setpgnInfoString(gamePGNFile);
}

export function copyDivContents(flag) {
  let divContent = document.querySelector(`.${flag || "NULL"}`)?.textContent;
  var tempElement = document.createElement("textarea");
  tempElement.value = divContent?.trim();
  document.body.appendChild(tempElement);
  tempElement.select();
  document.execCommand("copy");
  document.body.removeChild(tempElement);
}

export function getTimeControlCategory(timeControl) {
  if (timeControl.startsWith("3") || timeControl.startsWith("5")) {
    return "Blitz";
  }
  if (timeControl.startsWith("10")) {
    return "Rapid";
  }
  return "Casual";
}

// Helper function to format relative time
export function formatRelativeTime(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return "Just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
};

export function timeAndColorPreferenceReducer(actionData) {
  const data = [];
  if (!actionData?.id) return [null, null];
  else if (actionData.white_id && actionData.black_id) {
    data[0] = "random";
    data[1] = actionData.timecontrol;
    
  } else if (actionData.white_id && !actionData.black_id) {
    data[0] = "white";
    data[1] = actionData.timecontrol;
  } else {
    data[0] = "black";
    data[1] = actionData.timecontrol;
  }
  return data;
}

export const SUPABASE_CONFIG = [
  String(import.meta.env.VITE_SUPABASE_URL),
  String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
  { isSingleton: false },
];
