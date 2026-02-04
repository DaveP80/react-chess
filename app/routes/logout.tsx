import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, useRouteLoaderData, useSearchParams } from "@remix-run/react";
import { useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";
import { getSupabaseBrowserClient } from "~/utils/supabase.client";
import { createSupabaseServerClient } from "~/utils/supabase.server";
export const loader: LoaderFunction = async ({ request }) => {
  const { client, headers } = createSupabaseServerClient(request);
  const supabase = client;

  const status = await supabase.auth.signOut({ scope: "global" });
  if (status.error) {
    return Response.json({ error: status.error, ok: false });
  } else {
    return Response.json({ error: null, ok: true });
  }
};
export const action = async ({ request }: ActionFunctionArgs) => {
  return null;
};

export default function Index() {
  const { error, ok } = useLoaderData<typeof loader>();
  const Root = useRouteLoaderData("root");
  const [searchParams] = useSearchParams();
  const query = searchParams.get("query");
  const supabase = getSupabaseBrowserClient(Root?.VITE_SUPABASE_URL, Root?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY, true);
  const navigate = useNavigate();
  const UserContext = useContext(GlobalContext);

  useEffect(() => {
    try {
      if (query == "navbar") {
        async () => await supabase.auth.signOut({ scope: "global" });
      }
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem("auth");
      UserContext.setMemberRequest({});
      navigate("/login");
    }

    return () => {
      true;
    };
  }, [error, ok]);

  return <div className="div">...Logging Out</div>;
}
