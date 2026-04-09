import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "@remix-run/react";
import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import appStyles from "~/styles/app.css?url";
import { AppShell } from "~/components/layout/AppShell";
import { getUserAddress } from "~/lib/session.server";
import { pageMeta, SITE } from "~/lib/seo";

export async function loader({ request }: LoaderFunctionArgs) {
  const userAddress = await getUserAddress(request);
  // Public API URL exposed to the browser via window.ENV.
  // Server-side code uses STELLARPOD_API_URL (internal Docker DNS);
  // the browser uses PUBLIC_API_URL (the public api.stelo.life endpoint).
  const publicApiUrl =
    process.env.PUBLIC_API_URL ||
    process.env.STELLARPOD_API_URL ||
    "http://localhost:8000";
  return json({
    userAddress,
    ENV: {
      PUBLIC_API_URL: publicApiUrl,
    },
  });
}

export const meta: MetaFunction = () =>
  pageMeta({
    title: SITE.tagline,
    description: SITE.description,
    path: "/",
  });

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
  { rel: "shortcut icon", href: "/favicon.ico", type: "image/x-icon" },
  { rel: "apple-touch-icon", href: "/images/logo.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
  },
  { rel: "stylesheet", href: appStyles },
];

export default function App() {
  const { userAddress, ENV } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/logout";

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary-container">
        {isAuthRoute ? (
          <Outlet />
        ) : (
          <AppShell userAddress={userAddress}>
            <Outlet />
          </AppShell>
        )}
        <ScrollRestoration />
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)};`,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-on-surface font-body">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <span
            className="material-symbols-outlined text-6xl text-error"
            aria-hidden
          >
            error
          </span>
          <h1 className="text-2xl font-headline font-bold">
            Something went wrong
          </h1>
          <p className="text-on-surface-variant">
            Please try refreshing the page.
          </p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
