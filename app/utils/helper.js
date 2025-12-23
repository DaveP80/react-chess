export function checkIfRepetition(positions) {
    const counts = new Map();
    console.log(positions);
  
    for (const pos of positions) {
    let ss = pos.fen().indexOf("-");
    let subFEN = pos.fen().substring(0, ss-1);
      const c = (counts.get(subFEN) ?? 0) + 1;
      if (c === 3) return true;
      counts.set(subFEN, c);
    }
    console.log(counts)
  
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

    if (["undefined", "null", "NULL", "None"].some((item) => username.toLowerCase() == item.toLowerCase())) {
      return false;
    }
  
    return true;
  }

export function isValidAvatarURL(avatarURL) {
  if (avatarURL.length < 7) return false;
  let check = [".jpg", ".jpeg", ".png", ".svg"].some((item) => avatarURL.toLowerCase().endsWith(item))
  return check;
}

  