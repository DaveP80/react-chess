import {
  Link,
  Links,
  useLoaderData,
  useRevalidator
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { getOrCreateSessionId } from "~/utils/auth.server";
import MyHome from "~/components/MyHome";
import { createBrowserClient } from "@supabase/ssr";
import { LoaderFunction } from "@remix-run/node";
import { createSupabaseServerClient } from "~/utils/supabase.server";

export const loader: LoaderFunction = async ({ request }) => {

  const { supabase, setCookieHeaders } = createSupabaseServerClient(request);

  // On the server you can access user/session safely:


  const { data: { user }, error, } = await supabase.auth.getUser();

  // Example: run a row-level security read as the signed in user


  // const { data } = await supabase.from('todos').select('*');


  const headers: HeadersInit = {};

  if (setCookieHeaders.length > 0) {

    headers['Set-Cookie'] = setCookieHeaders;
  }

  return Response.json(
    {

      user
        : user ? {
          id
            : user.id,
          email
            : user.email
        } :
          null
      ,

      // you can also return data from DB queries

    },
    { headers }
  );
};

export default function App() {

  const
    { user } = useLoaderData<typeof loader>();

  return (
    <MyHome context={{ user }} />
  );
}