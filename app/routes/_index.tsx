import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useContext, useEffect } from "react";
import CreateGame from "~/components/CreateGame";
import { GlobalContext } from "~/context/globalcontext";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Chess Game - Play Online" },
    {
      name: "description",
      content: "Interactive chess game built with Remix and react-chessboard",
    },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const {client, headers} = createSupabaseServerClient(request);
  const supabase = client;
  let SupabaseData = null;
  
  const {
    data,
    error,
  } = await supabase.auth.getClaims();
  
  const userId = data?.claims?.sub;
  const userEmail = data?.claims?.email;

  if (userId && userEmail) {
    SupabaseData = await supabase.from("users").select("*").eq("u_id", userId);
  }

  return Response.json(
    {
      user: userId
        ? {
            id: userId,
            email: userEmail,
          }
        : null,
      rowData: SupabaseData
        ? SupabaseData?.data
          ? SupabaseData.data[0]
          : null
        : null,
      provider: data?.claims.app_metadata?.providers?.some((item) => item == "github") ? "github" : "email",

    },
    { headers }
  );
};

export default function Index() {
  const userData = useLoaderData<typeof loader>();
  const UserContext = useContext(GlobalContext);
  const PlayContext = useContext(GlobalContext);

  useEffect(() => {
    if (userData?.user?.id) {
      console.log(userData.data)
      UserContext.setUser({ ...UserContext.user, id: userData.user.id, provider: userData.provider, email: userData.user.email, username: userData.username});
    }
    if (userData?.rowData) {
      PlayContext.setPlayingGame(userData.rowData.isActive);
    }

    return () => {
      true;
    };
  }, [userData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <CreateGame />
    </div>
  );
}
