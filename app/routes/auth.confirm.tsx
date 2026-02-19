import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = "/myhome";
  const headers = new Headers();

  if (token_hash && type) {
    const { client, headers } = createSupabaseServerClient(request);
    const supabase = client;

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data?.user) {
      const { data: SupabaseData, error: insertError } = await supabase
        .from("users")
        .insert({
          u_id: data.user.id,
          email: data.user.email,
          created_at: new Date().toISOString(),
          verified: true,
          isActive: false,
          username: data.user.user_metadata.username,
          avatarURL:
            "https://cdn3.iconfinder.com/data/icons/family-member-flat-happy-family-day/512/Uncle-64.png",
          rating: {
            rapid_rating: 1500,
            blitz_rating: 1500,
            bullet_rating: 1500,
          },
        })
        .select()
        .single();
      if (SupabaseData) {
        return redirect(`${next}?intent=login&verified=true`, {
          headers,
        });
      } else if (insertError) {
        console.error("Supabase insert new user error:", insertError);
        return redirect("/auth/error", { headers });
      }
    }
    if (error) {
      console.error("OTP verification error:", error);
      return redirect("/auth/error", { headers });
    }
  }
  // return the user to an error page with instructions
  else {
    console.error("invalid email confirmation URL");

    return redirect("/auth/error", { headers });
  }
}

export default function Index() {
  return null;
}
