import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { lazy, Suspense } from "react";
import { getActiveGamesData } from "~/utils/apicalls.server";
import { newUserGameDataReturnObject } from "~/utils/helper";
import { createSupabaseServerClient } from "~/utils/supabase.server";
const MemberHome = lazy(() => import("~/components/MemberHome"));

export const loader: LoaderFunction = async ({ request, params }) => {

    const username = params.username;
  
  
  try {
    const { client, headers } = createSupabaseServerClient(request);
    const supabase = client;
    const {data, error} = await supabase.auth.getClaims();
    const user_id = data?.claims.sub;
    const {data: gameData, error: lookupError} = await supabase.rpc("lookup_games_played_by_username", {f_username: username});
    if (lookupError) {
      return Response.json({error: lookupError, message: "sql error on getting games played data"});
    }
    if (gameData.length == 0) {
      const {data: newUserGameData, error: lookupNewUserDataError} = await supabase.rpc("lookup_games_played_by_username_new_user", {f_username: username, user_id});
      if (lookupNewUserDataError) {
        return Response.json({error: lookupError, message: "sql error on getting union of two users data"});
      }
      return Response.json({go: true, data: newUserGameDataReturnObject(newUserGameData, username)}, {headers});
    }
    return Response.json({go: true, data: gameData}, {headers});
    
  } catch (error) {
    return Response.json({error}, {status: 500});
    
  }

};

export async function action({ request }: ActionFunctionArgs) {
  
  const response = await getActiveGamesData({request});
  
  return Response.json(response);
}

export default function Index() {
  

  return (
    <Suspense fallback={<div>...Loading</div>}>
      <MemberHome/>
    </Suspense>
  );
}
