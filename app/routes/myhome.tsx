import { useLoaderData } from "@remix-run/react";

import MyHome from "~/components/MyHome";
import { LoaderFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import { useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, setCookieHeaders } = createSupabaseServerClient(request);

  const urlVerified = new URL(request.url).searchParams.get("verified");
  const urlIntent = new URL(request.url).searchParams.get("intent");
  const urlUsername = new URL(request.url).searchParams.get("username");
  const headers: HeadersInit = {};
  let SupabaseData = null;

  if (setCookieHeaders.length > 0) {
    headers["Set-Cookie"] = setCookieHeaders;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (urlIntent === "signup" && urlVerified == "true") {
    SupabaseData = await supabase
      .from("users")
      .update({
        created_at: new Date().toISOString(),
        verified: true,
        avatarURL:
          "https://cdn3.iconfinder.com/data/icons/family-member-flat-happy-family-day/512/Uncle-64.png",
        rating: { rapid_rating: 1500, blitz_rating: 1500, bullet_rating: 1500 },
      })
      .eq("u_id", user?.id)
      .select();
  } else if (urlIntent === "signup" && urlVerified == "false") {
    SupabaseData = await supabase
      .from("users")
      .insert({
        u_id: user?.id,
        email: user?.email,
        created_at: new Date().toISOString(),
        verified: false,
        isActive: false,
        username: urlUsername,
        avatarURL:
          "https://cdn3.iconfinder.com/data/icons/family-member-flat-happy-family-day/512/Uncle-64.png",
        rating: { rapid_rating: 1500, blitz_rating: 1500, bullet_rating: 1500 },
      })
      .select();
  } else if (user?.id) {
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
  const UserInfo = useContext(GlobalContext);
  const PlayingData = useContext(GlobalContext);

  useEffect(() => {
    if (user?.id != null && rowData) {
      UserInfo.setUser({
        ...UserInfo.user,
        user: user.id,
        email: user.email,
        avatarUrl: rowData.avatarURL,
        username: rowData.username,
      });
      PlayingData.setPlayingGame(rowData.isActive);
    } else if (user?.id && !rowData) {
      UserInfo.setUser({ ...UserInfo.user, user: user.id, email: user.email });
      PlayingData.setPlayingGame(false);
    }

    return () => {
      true;
    };
  }, [user]);

  return <MyHome context={{ user }} />;
}
