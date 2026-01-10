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
    fen: parts[0],
    move: parts[1] || "",
    timestamp: parts[2] || "",
    whiteTime: parts[3] ? parseFloat(parts[3]) : null,
    blackTime: parts[4] ? parseFloat(parts[4]) : null,
  };
}

export function setFenHistoryHelper(
  gameCopy,
  fenHistory,
  move_san,
  moveHistory
) {
  if (!fenHistory.length) {
    return [true, [gameCopy], [move_san]];
  }

  const lastItem = fenHistory[fenHistory.length - 1];
  if (lastItem.fen() === gameCopy.fen()) {
    return [false, fenHistory, moveHistory];
  } else {
    return [true, [...fenHistory, gameCopy], [...moveHistory, move_san]];
  }
}

export function timeOutGameOverReducer(args) {
  switch (args) {
    case "white": {
      return "Black";
    }
    case "black": {
      return "White";
    }
    case "game over": {
      return null;
    }
    default:
      return null;
  }
}

export function gameStartFinishReducer(
  fenHistory,
  activeGame,
  timeOut,
  gameData,
  resign
) {
  const actualGame =
    fenHistory.length > 0 ? fenHistory[fenHistory.length - 1] : null;
  if (!actualGame) return [null, null];

  // Check for threefold repetition
  const isThreeFoldRepit = checkIfRepetition(fenHistory);
  // Display indicators are based on what's currently shown on the board
  const isCheckmate = activeGame.isCheckmate();
  const isDraw = activeGame.isDraw();
  const isStalemate = activeGame.isStalemate();
  const isFiftyMove = activeGame.isDrawByFiftyMoves();
  const isInsufficient = activeGame.isInsufficientMaterial();
  const actualGameTurn = actualGame.turn();
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

export const SUPABASE_CONFIG = [
  String(import.meta.env.VITE_SUPABASE_URL),
  String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
  { isSingleton: false },
];
