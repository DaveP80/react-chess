import { useLoaderData } from "@remix-run/react";

import MyHome from "~/components/MyHome";
import { LoaderFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, setCookieHeaders } = createSupabaseServerClient(request);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const headers: HeadersInit = {};

  if (setCookieHeaders.length > 0) {
    headers["Set-Cookie"] = setCookieHeaders;
  }

  return Response.json(
    {
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
    },
    { headers }
  );
};

export default function Index() {
  const { user } = useLoaderData<typeof loader>();

  return <MyHome context={{ user }} />;
}
