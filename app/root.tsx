import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import appStyles from "~/styles/app.css?url";
import { AppShell } from "~/components/layout/AppShell";

export const links: LinksFunction = () => [
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
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-surface text-on-surface font-body selection:bg-primary selection:text-on-primary-container">
        <AppShell>
          <Outlet />
        </AppShell>
        <ScrollRestoration />
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
