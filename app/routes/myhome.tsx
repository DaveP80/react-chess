import { Outlet, useLoaderData, useNavigate } from "@remix-run/react";

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
  const urlProvider = new URL(request.url).searchParams.get("provider");
  let SupabaseData = null;
  const supabase = client;
  let ghProvider = null;

  const p = [urlProvider];
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims.sub;
  const userEmail = data?.claims.email;

  if (error) {
    throw redirect("/login", { headers });
  }

  try {
    if (userId && userEmail) {
      //First two clauses handle the case of an email signup only.
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
          .eq("u_id", userId)
          .select();
      } else if (urlIntent === "signup" && urlVerified == "false") {
        SupabaseData = await supabase
          .from("users")
          .insert({
            u_id: userId,
            email: userEmail,
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
      } else if (urlProvider == "github" && urlIntent == "login") {
        ghProvider = "github";
        SupabaseData = await supabase
          .from("users")
          .select("*")
          .eq("u_id", userId);
        if (SupabaseData && SupabaseData?.data?.length == 0) {
          SupabaseData = await supabase
            .from("users")
            .insert({
              u_id: userId,
              email: userEmail,
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
      } else {
        //if this clause is used, the user is simply logging in with email credentials.
        SupabaseData = await supabase
          .from("users")
          .select("*")
          .eq("u_id", userId);
      }
    }

  } catch (error) {
    console.error(error);
    throw redirect("/login", { headers });
  } finally {
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
        provider: p.some((item) => item === "github") ? "github" : "email",
        intent: urlIntent
      },
      { headers }
    );
  }
};

export default function Index() {
  const { user, rowData, provider } = useLoaderData<typeof loader>();
  const UserInfo = useContext(GlobalContext);
  const PlayingData = useContext(GlobalContext);
  const navigate = useNavigate();

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
