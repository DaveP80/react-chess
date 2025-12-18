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
  