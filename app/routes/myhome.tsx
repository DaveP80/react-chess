import { useActionData, useNavigate, useRouteLoaderData } from "@remix-run/react";

import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { lazy, Suspense, useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";
import { getActiveGamesData } from "~/utils/apicalls.server";
const MyHome = lazy(() => import("~/components/MyHome"));

export const loader: LoaderFunction = async ({ request }) => {

  return Response.json({message: "user login and signup data fetched from root"});

};

export async function action({ request }: ActionFunctionArgs) {
  
  const response = await getActiveGamesData({request});
  
  return response;
}

export default function Index() {
  const { user, rowData, provider } = useRouteLoaderData<typeof loader>("root");
  const actionData = useActionData<typeof action>();

  const PlayingData = useContext(GlobalContext);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (actionData?.go) {
      const colorPreference = actionData.data[0].white_id == user?.id ? "white" : "black";
      localStorage.setItem("pairing_info", JSON.stringify({colorPreference, timeControl: actionData.data[0].pgn_info.time_control}));
      navigate(`/game/${actionData.data[0].id}`);
    }
  
    return () => {
      true
    }
  }, [actionData, rowData])
  

  return (
    <Suspense fallback={<div>...Loading</div>}>
      <MyHome/>
    </Suspense>
  );
}
