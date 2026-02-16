// app/utils/openings.server.ts
import { openingBook, findOpening } from "@chess-openings/eco.json";
import { Opening } from "~/types";

// Cache the opening book in memory after first load
let cachedBook: Awaited<ReturnType<typeof openingBook>> | null = null;

export async function getOpeningBook() {
  if (!cachedBook) {
    cachedBook = await openingBook();
  }
  return cachedBook;
}

export async function lookupOpening(fen: string): Promise<Opening | null> {
  const book = await getOpeningBook();
  const opening = findOpening(book, fen);
  
  if (opening) {
    return {
      name: opening.name,
      eco: opening.eco,
      moves: opening.moves,
    };
  }
  return null;
}

/**
 * Look through an array of FEN positions and return the deepest opening found.
 * Stops searching once positions are no longer in the opening book.
 * @param fenHistory - Array of FEN strings in chronological order
 * @returns The last/deepest opening found, or null if none found
 */
export async function lookupOpeningFromHistory(
  fenHistory: string[]
): Promise<Opening | null> {
  const book = await getOpeningBook();
  let lastOpening: Opening | null = null;
  if (!fenHistory) return lastOpening;
  let idx = fenHistory.length - 1;

  for (const fen of fenHistory) {
    const opening = findOpening(book, fen);

    if (opening) {
      lastOpening = {
        name: opening.name,
        eco: opening.eco,
        moves: opening.moves,
        idx
      };
      break;
    };
    idx -= 1;
  }

  return lastOpening;
}