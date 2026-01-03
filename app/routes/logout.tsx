import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useEffect } from "react";
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
  const [searchParams] = useSearchParams();
  const query = searchParams.get("query");
  //const UserContext = useContext(GlobalContext);
  const supabase = getSupabaseBrowserClient(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (query == "navbar") {
        async () => await supabase.auth.signOut({ scope: "global" });
      }
    } catch (error) {
      console.error(error);
    } finally {

      navigate("/login");
    }

    return () => {
      true;
    };
  }, [error, ok]);

  return <div className="div">...Logging Out</div>;
}
