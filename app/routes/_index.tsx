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
  const { supabase, setCookieHeaders } = createSupabaseServerClient(request);
  const headers: HeadersInit = {};
  let SupabaseData = null;

  if (setCookieHeaders.length > 0) {
    headers["Set-Cookie"] = setCookieHeaders;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user?.id) {
    SupabaseData = await supabase.from("users").select("*").eq("u_id", user.id);
  }

  return Response.json(
    {
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
      rowData: SupabaseData
        ? SupabaseData?.data
          ? SupabaseData.data[0]
          : null
        : null,
    },
    { headers }
  );
};

export default function Index() {
  const { user, rowData } = useLoaderData<typeof loader>();
  const UserContext = useContext(GlobalContext);
  const PlayContext = useContext(GlobalContext);

  useEffect(() => {
    if (user?.id) {
      UserContext.setUser({ ...UserContext.user, id: user.id });
    }
    if (rowData) {
      PlayContext.setPlayingGame(rowData.isActive);
    }

    return () => {
      true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <CreateGame />
    </div>
  );
}
