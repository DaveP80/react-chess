import { useRouteLoaderData } from "@remix-run/react";

import { LoaderFunction, redirect } from "@remix-run/node";
import { lazy, Suspense, useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";
const MyHome = lazy(() => import("~/components/MyHome"));

export const loader: LoaderFunction = async ({ request }) => {

  // const urlVerified = new URL(request.url).searchParams.get("verified");
  // const urlIntent = new URL(request.url).searchParams.get("intent");
  // const urlUsername = new URL(request.url).searchParams.get("username");
  // const urlProvider = new URL(request.url).searchParams.get("provider");
  return Response.json({message: "user login and signup data fetched from root"});



};

export default function Index() {
  const { user, rowData, provider } = useRouteLoaderData<typeof loader>("root");
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
