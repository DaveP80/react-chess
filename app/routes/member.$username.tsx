import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { lazy, Suspense } from "react";
import { getActiveGamesData } from "~/utils/apicalls.server";
import { createSupabaseServerClient } from "~/utils/supabase.server";
const MemberHome = lazy(() => import("~/components/MemberHome"));

export const loader: LoaderFunction = async ({ request, params }) => {

    const username = params.username;
  
  
  try {
    const { client, headers } = createSupabaseServerClient(request);
    const supabase = client;
    const {data: gameData, error: lookupError} = await supabase.rpc("lookup_games_played_by_username", {f_username: username});
    if (lookupError) {
      return Response.json({error: lookupError, message: "sql error on getting games played data"});
    }

    return Response.json({go: true, data: gameData}, {headers});
    
  } catch (error) {
    return Response.json({error}, {headers: new Headers()});
    
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
