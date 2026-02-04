import { LoaderFunction } from "@remix-run/node";
import { lazy, Suspense } from "react";
import { createSupabaseServerClient } from "~/utils/supabase.server";
const MyHome = lazy(() => import("~/components/MyHome"));

export const loader: LoaderFunction = async ({ request }) => {
  
  
  try {
    const { client, headers } = createSupabaseServerClient(request);
    const supabase = client;
  
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    const {data: gameData, error: lookupError} = await supabase.rpc("lookup_games_played_by_userid", {user_id: userId});
    if (lookupError) {
      return Response.json({error: lookupError, message: "sql error on getting games played data"});
    }

    return Response.json({go: true, data: gameData});
    
  } catch (error) {
    return Response.json({error});
    
  }

};

export default function Index() {

  return (
    <Suspense fallback={<div>...Loading</div>}>
      <MyHome/>
    </Suspense>
  );
}
