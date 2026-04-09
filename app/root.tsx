import { useState, useCallback } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { AppProvider, Frame, Navigation } from "@shopify/polaris";
import {
  HomeIcon,
  OrderIcon,
  ProductIcon,
  CollectionIcon,
  ImageIcon,
  DeliveryIcon,
  WalletIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import appStyles from "~/styles/app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: appStyles },
];

function AppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: "Dashboard",
            icon: HomeIcon,
            onClick: () => navigate("/"),
            selected: location.pathname === "/",
          },
          {
            label: "Products",
            icon: ProductIcon,
            onClick: () => navigate("/products"),
            selected: location.pathname.startsWith("/products"),
          },
          {
            label: "Catalog",
            icon: CollectionIcon,
            onClick: () => navigate("/catalog"),
            selected: location.pathname === "/catalog",
          },
          {
            label: "Orders",
            icon: OrderIcon,
            onClick: () => navigate("/orders"),
            selected: location.pathname.startsWith("/orders"),
          },
          {
            label: "Designs",
            icon: ImageIcon,
            onClick: () => navigate("/designs"),
            selected: location.pathname.startsWith("/designs"),
          },
          {
            label: "Providers",
            icon: DeliveryIcon,
            onClick: () => navigate("/providers"),
            selected: location.pathname === "/providers",
          },
          {
            label: "Escrow",
            icon: WalletIcon,
            onClick: () => navigate("/escrow"),
            selected: location.pathname === "/escrow",
          },
          {
            label: "Settings",
            icon: SettingsIcon,
            onClick: () => navigate("/settings"),
            selected: location.pathname === "/settings",
          },
        ]}
      />
    </Navigation>
  );
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={enTranslations}>
          <Frame navigation={<AppNavigation />}>
            <Outlet />
          </Frame>
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={enTranslations}>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h1>Something went wrong</h1>
            <p>Please try refreshing the page.</p>
          </div>
        </AppProvider>
        <Scripts />
      </body>
    </html>
  );
}
