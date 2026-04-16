import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useLocation } from "@remix-run/react";
import { NotificationBell } from "~/components/NotificationBell";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/provider_token=([^;]+)/);
  const token = tokenMatch?.[1];
  if (!token) {
    const url = new URL(request.url);
    const next = url.pathname + url.search;
    return redirect(`/provider-login?next=${encodeURIComponent(next)}`);
  }
  return json({ token });
}

const PROVIDER_NAV = [
  { label: "Orders", icon: "inbox", href: "/provider/orders" },
  { label: "Notifications", icon: "notifications", href: "/provider/notifications" },
  { label: "Settings", icon: "settings", href: "/provider/settings" },
];

export default function ProviderLayout() {
  const { token } = useLoaderData<typeof loader>();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top nav */}
      <nav className="border-b border-surface-container-high bg-surface-container/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold font-headline text-primary mr-4">
              StellarPOD Provider
            </span>
            {PROVIDER_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell auth={{ type: "provider", token }} viewAllHref="/provider/notifications" />
            <Link
              to="/provider-onboarding"
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Sign out
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
