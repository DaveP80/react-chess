import { ActionFunctionArgs, LoaderFunction } from "@remix-run/node";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { useContext, useEffect } from "react";
import { GlobalContext } from "~/context/globalcontext";
import { getSupabaseBrowserClient } from "~/utils/supabase.client";
import { createSupabaseServerClient } from "~/utils/supabase.server";
export const loader: LoaderFunction = async ({ request }) => {
  const { supabase, setCookieHeaders } = createSupabaseServerClient(request);

  await supabase.auth.signOut({ scope: "global" });
  return Response.json({});
};
export const action = async ({ request }: ActionFunctionArgs) => {
  return null;
};

export default function Index() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("query");
  const navigate = useNavigate();
  const UserContext = useContext(GlobalContext);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    try {
      if (query == "navbar") {
        async () => await supabase.auth.signOut({ scope: "global" });
      }
      UserContext.setUser({
        id: "",
        email: "",
        username: "",
        avatarUrl: "",
      });
      const localAuth = localStorage.getItem("auth");
      if (localAuth) {
        localStorage.removeItem("auth");
      }
    } catch (error) {
      console.error(error);
    }
    navigate("/myhome");

    return () => {
      true;
    };
  }, []);

  return null;
}
