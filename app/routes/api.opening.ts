// app/routes/api.opening.ts
import { type LoaderFunctionArgs } from "@remix-run/node";
import { lookupOpeningFromHistory } from "~/utils/openings.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let fenHistoryWithStart = url.searchParams.get("fen");
  if (!fenHistoryWithStart) {
    return Response.json({ error: "FEN required" }, { status: 400 });
  }
  fenHistoryWithStart = fenHistoryWithStart.split(",").reverse();
  
  const opening = await lookupOpeningFromHistory(fenHistoryWithStart);
  return Response.json({ opening });
}