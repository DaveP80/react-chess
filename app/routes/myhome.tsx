import { useLoaderData } from "@remix-run/react";

import { LoaderFunction, redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/utils/supabase.server";
import { lazy, Suspense, useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";
const MyHome = lazy(() => import("~/components/MyHome"));

export const loader: LoaderFunction = async ({ request }) => {
  const { client, headers } = createSupabaseServerClient(request);

  const urlVerified = new URL(request.url).searchParams.get("verified");
  const urlIntent = new URL(request.url).searchParams.get("intent");
  const urlUsername = new URL(request.url).searchParams.get("username");
  const urlID = new URL(request.url).searchParams.get("id");
  const urlEmail = new URL(request.url).searchParams.get("email");
  const urlProvider = new URL(request.url).searchParams.get("provider");
  let SupabaseData = null;
  const supabase = client;
  let ghUrlId = null;
  let ghEmail = null;
  let ghProvider = null;

  const p = [urlProvider];

  // if (error || !user) {
  //   // You can store the original path to redirect back after login

  //   const url = new URL(request.url);

  //   const redirectTo = url.pathname + url.search;

  //   throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, {
  //     headers,
  //   });
  // }
  try {
    if (urlID && urlEmail) {
      if (urlIntent === "signup" && urlVerified == "true") {
        SupabaseData = await supabase
          .from("users")
          .update({
            created_at: new Date().toISOString(),
            verified: true,
            rating: {
              rapid_rating: 1500,
              blitz_rating: 1500,
              bullet_rating: 1500,
            },
          })
          .eq("u_id", urlID)
          .select();
      } else if (urlIntent === "signup" && urlVerified == "false") {
        SupabaseData = await supabase
          .from("users")
          .insert({
            u_id: urlID,
            email: urlEmail,
            created_at: new Date().toISOString(),
            verified: false,
            isActive: false,
            username: urlUsername,
            avatarURL:
              "https://cdn3.iconfinder.com/data/icons/family-member-flat-happy-family-day/512/Uncle-64.png",
            rating: {
              rapid_rating: 1500,
              blitz_rating: 1500,
              bullet_rating: 1500,
            },
          })
          .select();
      } else if (urlID) {
        SupabaseData = await supabase
          .from("users")
          .select("*")
          .eq("u_id", urlID);
      }
    } else if (urlProvider == "github") {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user?.id) {
        ghProvider = "github"
        SupabaseData = await supabase
          .from("users")
          .select("*")
          .eq("u_id", user.id);
        if (SupabaseData && SupabaseData?.data?.length == 0) {
          SupabaseData = await supabase
            .from("users")
            .insert({
              u_id: user.id,
              email: user.email,
              created_at: new Date().toISOString(),
              verified: true,
              isActive: false,
              username: "",
              avatarURL:
                "https://cdn3.iconfinder.com/data/icons/family-member-flat-happy-family-day/512/Uncle-64.png",
              rating: {
                rapid_rating: 1500,
                blitz_rating: 1500,
                bullet_rating: 1500,
              },
            })
            .select();
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    return Response.json(
      {
        user:
          urlID || ghUrlId
            ? {
                id: urlID || ghUrlId,
                email: urlEmail || ghEmail,
              }
            : null,
        rowData: SupabaseData
          ? SupabaseData?.data
            ? SupabaseData.data[0]
            : null
          : null,
        provider: ghProvider || p.some((item) => item === "github") ? "github" : "email",
        intent: urlIntent,
      },
      { headers }
    );
  }
};

export default function Index() {
  const { user, rowData, provider } = useLoaderData<typeof loader>();
  const UserInfo = useContext(GlobalContext);
  const PlayingData = useContext(GlobalContext);

  useEffect(() => {
    if (user?.id != null && rowData) {
      UserInfo.setUser({
        ...UserInfo.user,
        id: user.id,
        email: user.email,
        avatarUrl: rowData.avatarURL,
        username: rowData.username,
        verified: rowData.verified,
        provider,
      });
      PlayingData.setPlayingGame(rowData.isActive);
      if (provider === "github") {
        async () => {
          await localStorage.setItem(
            "auth",
            JSON.stringify({ new_signup: false, is_logged_in: true })
          );
        };
      }
      if (provider === "email") {
        async () => {
          await localStorage.setItem(
            "auth",
            JSON.stringify({ new_signup: true, is_logged_in: true })
          );
        };
      }
    } else if (user?.id && !rowData) {
      //for now rowData is returned on signup and login
      UserInfo.setUser({ ...UserInfo.user, user: user.id, email: user.email });
      PlayingData.setPlayingGame(false);
    }

    return () => {
      true;
    };
  }, [user, rowData]);

  return (
    <Suspense fallback={<div>...Loading</div>}>
      <MyHome />;
    </Suspense>
  );
}
