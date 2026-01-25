import { useRouteLoaderData } from "@remix-run/react";

import { LoaderFunction } from "@remix-run/node";
import { lazy, Suspense, useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";
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

    return Response.json({go: true, data: gameData}, {headers});
    
  } catch (error) {
    return Response.json({error}, {headers: new Headers()});
    
  }

};

export default function Index() {
  const { user, rowData } = useRouteLoaderData<typeof loader>("root");

  const PlayingData = useContext(GlobalContext);

  useEffect(() => {
    if (user?.id && rowData?.u_id) {

      PlayingData.setPlayingGame(rowData.isActive);
    } else if (user?.id && !rowData) {
      //for now rowData is returned on signup and login
      PlayingData.setPlayingGame(false);
    }
    return () => {
      true;
    };
  }, [user, rowData]);

  

  return (
    <Suspense fallback={<div>...Loading</div>}>
      <MyHome/>
    </Suspense>
  );
}
