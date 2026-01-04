export function checkIfRepetition(positions) {
  const counts = new Map();
  console.log(positions);

  for (const pos of positions) {
    let ss = pos.fen().indexOf("-");
    let subFEN = pos.fen().substring(0, ss - 1);
    const c = (counts.get(subFEN) ?? 0) + 1;
    if (c === 3) return true;
    counts.set(subFEN, c);
  }
  console.log(counts);

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

export const SUPABASE_CONFIG = [String(import.meta.env.VITE_SUPABASE_URL), String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY), {isSingleton: false}];