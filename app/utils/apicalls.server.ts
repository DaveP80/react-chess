/**
 * Api calls for supabase and user data at root, myhome and for active games.
 */

import { redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "./supabase.server";
import { MyHomeData } from "~/types";

export async function getMyHomeData({ request }: any) {
  const urlVerified = new URL(request.url).searchParams.get("verified");
  const urlIntent = new URL(request.url).searchParams.get("intent") || "";
  const urlUsername = new URL(request.url).searchParams.get("username");
  const urlProvider = new URL(request.url).searchParams.get("provider");
  if (urlIntent === "signup" || urlIntent === "login") {
    const { client, headers } = createSupabaseServerClient(request);
    let SupabaseData = null;
    const p = [urlProvider];
    const supabase = client;
    const { data, error } = await supabase.auth.getClaims();

    const userId = data?.claims.sub;
    const userEmail = data?.claims.email;

    if (error) {
      throw redirect("/login", { headers });
    }

    try {
      if (userId && userEmail) {
        //First two clauses handle the case of an email signup only.
        const selectAll = async () => {
          SupabaseData = await supabase
            .from("users")
            .select("*")
            .eq("u_id", userId);
        };
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
          await selectAll();
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
        } else if (urlIntent == "login") {
          await selectAll();
        } else {
          return Response.json({
            user: {},
            rowData: {},
            provider: {},
            intent: "",
            message: "missing params in myhome user profile handler.",
          });
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
            : {},
          rowData: SupabaseData
            ? SupabaseData?.data
              ? SupabaseData.data[0]
              : null
            : {},
          provider: p.some((item) => item === "github") ? "github" : "email",
          intent: urlIntent,
        } satisfies MyHomeData,
        { headers }
      );
    }
  } else {
    try {
      const { client, headers } = createSupabaseServerClient(request);
      const supabase = client;
      let SupabaseData = null;

      const { data, error } = await supabase.auth.getClaims();

      const userId = data?.claims?.sub;
      const userEmail = data?.claims?.email;

      if (error) {
        return Response.json(
          {
            user: {},
            rowData: {},
            error,
            provider: "",
            message: "error on supabase auth claims",
          } satisfies MyHomeData,
          { headers }
        );
      }

      if (userId && userEmail) {
        SupabaseData = await supabase
          .from("users")
          .select("*")
          .eq("u_id", userId);
      }

      return Response.json(
        {
          user: userId
            ? {
                id: userId,
                email: userEmail,
              }
            : {},
          rowData: SupabaseData
            ? SupabaseData?.data
              ? SupabaseData.data[0]
              : null
            : {},
          provider: data?.claims.app_metadata?.providers?.some(
            (item) => item == "github"
          )
            ? "github"
            : "email",
        } satisfies MyHomeData,
        { headers }
      );
    } catch (error) {
      return Response.json({
        user: {},
        rowData: {},
        provider: "",
        error,
      } satisfies MyHomeData);
    }
  }
};



export async function getActiveGamesData({ request }: any) {
  try {
    const { client, headers } = createSupabaseServerClient(request);
    const supabase = client;
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    const formData = await request.formData();
    if (formData.get("intent") == "no_routing_id") {

      const { data, error: activeGamesError } = await supabase.rpc("lookup_userdata_on_active_status", {
        user_id: userId,
      });
      if (error || activeGamesError) {
        return Response.json({ error: error || activeGamesError, go: false }, { headers });
      } else {
        return Response.json({ data, message: "retrieved active game information on current user.", go: true, routing_id: data[0].id }, { headers });
        //return redirect(`/game/${data[0].id}`)
      }
      
    }
    else {
      //return Response.json({go: true, message: "navigation with local saved active game data with game_id.", routing_id: formData.get("intent")})
      return redirect(`/game/${formData.get("intent")}`)
    }
  } catch (error) {
    return Response.json({ error });
  }
}
