// app/actions/game.server.ts
import type { ActionFunctionArgs } from "@remix-run/node";
import { gamesNewRequestOnUserColor, rematchRequestNewRequestPairing } from "~/utils/action.server";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export async function action({ request }: ActionFunctionArgs) {
    const { client, headers } = createSupabaseServerClient(request);
    const supabase = client;
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    const formData = Object.fromEntries(await request.formData());
    if (error) {
      return Response.json({ error, go: false }, { headers });
    }
  
    if (
      !userId ||
      !String(formData?.colorPreference) ||
      !String(formData?.timeControl)
    ) {
      return Response.json(
        { message: "invalid form data submitted", go: false },
        { headers },
      );
    }
  
    if (userId) {
      //look up pairing games on current user id.
      let response;
      //check if a rematch request or a quick pairing
      if (String(formData?.isPairingMaker) == "false") {
        response = await rematchRequestNewRequestPairing(
          supabase,
          userId,
          String(formData?.username),
          JSON.parse(String(formData?.requestGameData)),
          String(formData?.colorPreference),
          String(formData?.timeControl),
          String(formData?.isRated),
        );

      } else if (String(formData?.isPairingMaker) == "true") {
        response = await gamesNewRequestOnUserColor(
          supabase,
          userId,
          String(formData?.colorPreference),
          String(formData?.timeControl),
          String(formData?.isRated),
        );
      }
      return Response.json(response);
    }
    const timeControl = String(formData.timeControl);
  
    const validTimeControls = [
      "3+0",
      "3+2",
      "5+0",
      "5+3",
      "10+0",
      "10+5",
      "unlimited",
    ];
  
    if (!validTimeControls.includes(timeControl)) {
      return Response.json({ error: "Invalid time control" }, { status: 400 });
    }
  
    return Response.json({});
  }