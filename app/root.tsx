import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/styles/tailwind.css?url";
import Navigation from "./components/Navigation";
import GlobalContextProvider from "./context/globalcontext";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

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
          <Navigation />
          <Outlet />
        </GlobalContextProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
