import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData } from "@remix-run/react";
import { isValidAvatarURL, isValidUsername } from "~/utils/helper";
import { createSupabaseServerClient } from "~/utils/supabase.server";

/* ---------------- LOADER ---------------- */

export async function loader({ request }: LoaderFunctionArgs) {
  const { client, headers } = createSupabaseServerClient(request);
  const supabase = client;
  let SupabaseData = null;

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const userEmail = data?.claims.email;

  if (!userId) {
    return redirect("/login", { headers });
  }

  if (error) {
    return redirect("/myhome", { headers });
  }

  try {
    SupabaseData = await supabase.from("users").select("*").eq("u_id", userId);
  } catch (error) {
    console.error(error);
    return redirect("/myhome", { headers });
  } finally {
    if (!SupabaseData) {
      return redirect("/myhome", { headers });
    } else {
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
          provider: data?.claims.app_metadata?.providers?.some(
            (item) => item == "github"
          )
            ? "github"
            : "email",
          intent: "",
        },
        { headers }
      );
    }
  }
}

/* ---------------- ACTION ---------------- */

export async function action({ request }: ActionFunctionArgs) {
  const { client, headers } = createSupabaseServerClient(request);
  const supabase = client;
  let SupabaseData = null;

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const userEmail = data?.claims.email;
  const provider = data?.claims.app_metadata?.providers?.some(
    (item) => item == "github"
  )
    ? "github"
    : "email";
  const formData = Object.fromEntries(await request.formData());
  let errStringBuilder = "";
  let errURLBuilder = "";

  if (formData["update-username"] || formData["avatarURL"]) {
    const username = String(formData["update-username"]);
    const avatarURL = String(formData["avatarURL"]);
    const usernameNcheck =
      typeof username == "string" ? isValidUsername(username) : null;
    const urlCheck =
      typeof avatarURL == "string" ? isValidAvatarURL(avatarURL) : null;
    if (formData["update-username"] && !usernameNcheck) {
      errStringBuilder += `Invalid username ${
        !usernameNcheck ? "need username longer than 3 and alphanumeric." : ""
      }`;
      //return Response.json({ error: `Invalid username ${!usernameNcheck ? "need username longer than 3 and alphanumeric." : ""}` }, { status: 400 });
    }
    if (formData["avatarURL"] && !urlCheck) {
      errURLBuilder += `Invalid avatar URL. Please enter a valid image file type.`;
      //return Response.json({ error: `Invalid username ${!usernameNcheck ? "need username longer than 3 and alphanumeric." : ""}` }, { status: 400 });
    }

    const supabaseObj = { avatarURL: "", username: "" };
    [avatarURL, username].forEach((item, i) => {
      if (i == 0) {
        if (urlCheck) {
          supabaseObj.avatarURL = item;
        } else {
          Reflect.deleteProperty(supabaseObj, "avatarURL");
        }
      } else if (i == 1) {
        if (usernameNcheck) {
          supabaseObj.username = item;
        } else {
          Reflect.deleteProperty(supabaseObj, "username");
        }
      }
    });
    try {
      if (provider == "github" && (usernameNcheck || urlCheck)) {
        SupabaseData = await supabase
          .from("users")
          .update(supabaseObj)
          .eq("u_id", userId)
          .select();
      }
    } catch (error) {
      return Response.json(
        { errMessages: [errStringBuilder, errURLBuilder], go: false, error },
        { headers }
      );
    } finally {
      return Response.json(
        {
          errMessages: [errStringBuilder, errURLBuilder],
          go: true,
          rowData: SupabaseData?.data?.shift(),
        },
        { headers }
      );
    }
  }
  return Response.json(
    { errMessages: [errStringBuilder, errURLBuilder], go: false },
    { headers }
  );
}

/* ---------------- COMPONENT ---------------- */

export default function Index() {
  const userData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">
        Account Settings
      </h1>

      {/* ---- PROFILE UPDATE ---- */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-800">Profile</h2>

        <Form method="post" className="space-y-4">
          {userData?.provider == "github" && !userData?.rowData.username && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Enter a Username
              </label>
              <input
                name="update-username"
                placeholder="new username"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-light"
              />
            </div>
          )}

          <div className="space-y-1">
            {userData?.rowData?.avatarURL && (
              <div className="block text-sm font-medium text-green-900">
                <p>Current image: {userData?.rowData?.avatarURL}</p>
              </div>
            )}
            <label className="block text-sm font-medium text-gray-700">
              Update Avatar URL
            </label>
            <input
              name="avatarURL"
              placeholder="http://"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-light"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              Save changes
            </button>
          </div>
        </Form>
      </section>

      {/* ---- EMAIL VERIFICATION ---- */}
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-medium text-gray-800">Email</h2>

        <p className="mb-4 text-sm text-gray-600">
          Email:{" "}
          <span className="font-medium text-gray-900">
            {userData?.user.email}
          </span>
        </p>

        {userData?.rowData.verified ? (
          <p className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
            ✅ Email verified
          </p>
        ) : (
          <Form method="post">
            <p className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              ❌ Please verify your email.
            </p>
            <input type="hidden" name="verify-email" />
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              name="intent"
              value="verify-email"
            >
              Send verification email
            </button>
          </Form>
        )}
      </section>

      {/* ---- FEEDBACK ---- */}
      {actionData?.errMessages?.length &&
        actionData.errMessages.map((item: any) =>
          item.length ? (
            <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {item || ""}
            </p>
          ) : null
        )}

      {actionData?.success && (
        <p className="mt-6 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          {actionData.success}
        </p>
      )}
    </div>
  );
}
