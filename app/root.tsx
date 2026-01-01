import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunction, LoaderFunctionArgs } from "@remix-run/node";
import stylesheet from "~/styles/tailwind.css?url";
import Navigation from "./components/Navigation";
import GlobalContextProvider, { GlobalContext } from "./context/globalcontext";
import { getMyHomeData } from "./utils/apicalls";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const loader: LoaderFunction = async({request}: LoaderFunctionArgs) => {
  const response = await getMyHomeData({request});
  return response;
}



export function ErrorBoundary() {
  useRouteError();
  return (
    <html>
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Link to="/">Go to Login and Dashboard</Link>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user, rowData, provider } = useLoaderData<typeof loader>();
    
    return (
      <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <GlobalContextProvider>
          <Navigation user={user} />
          <Outlet />
        </GlobalContextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
