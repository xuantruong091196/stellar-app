import { Link, useLocation, Form } from "@remix-run/react";
import type { ReactNode } from "react";
import { truncateAddress } from "~/lib/stellar";

interface NavItem {
  label: string;
  icon: string;
  href: string;
  match?: (path: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/", match: (p) => p === "/" },
  {
    label: "Products",
    icon: "inventory_2",
    href: "/products",
    match: (p) => p.startsWith("/products"),
  },
  {
    label: "Orders",
    icon: "shopping_cart",
    href: "/orders",
    match: (p) => p.startsWith("/orders"),
  },
  {
    label: "Designs",
    icon: "palette",
    href: "/designs",
    match: (p) => p.startsWith("/designs"),
  },
  {
    label: "Providers",
    icon: "local_shipping",
    href: "/providers",
    match: (p) => p.startsWith("/providers"),
  },
  {
    label: "Escrow",
    icon: "account_balance_wallet",
    href: "/escrow",
    match: (p) => p.startsWith("/escrow"),
  },
  {
    label: "Settings",
    icon: "settings",
    href: "/settings",
    match: (p) => p.startsWith("/settings"),
  },
];

export function AppShell({
  children,
  userAddress,
}: {
  children: ReactNode;
  userAddress: string | null;
}) {
  const location = useLocation();
  const currentPath = location.pathname;

  const activeLabel =
    NAV_ITEMS.find((item) =>
      item.match ? item.match(currentPath) : currentPath === item.href,
    )?.label ?? "Dashboard";

  return (
    <>
      {/* ─── TopAppBar ──────────────────────────────── */}
      <header className="fixed top-0 z-50 bg-[#121317] flex justify-between items-center w-full px-6 h-16 font-headline tracking-tight">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="Stelo logo"
              className="w-9 h-9 rounded-xl object-contain"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-[#6366F1] to-[#22D3EE] bg-clip-text text-transparent">
              Stelo
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 items-center text-sm">
            <span className="text-on-surface-variant">{activeLabel}</span>
          </div>
          {userAddress ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full">
                <div className="w-6 h-6 rounded-full stellar-gradient" />
                <span className="font-mono text-xs text-on-surface-variant">
                  {truncateAddress(userAddress)}
                </span>
              </div>
              <Form method="post" action="/logout">
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-red-400 transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <span
                    className="material-symbols-outlined text-base"
                    aria-hidden
                  >
                    logout
                  </span>
                </button>
              </Form>
            </div>
          ) : (
            <Link
              to="/login"
              className="stellar-gradient text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* ─── SideNavBar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col py-8 h-screen w-64 fixed left-0 top-0 bg-[#121317] z-40">
        <div className="px-6 mb-12 mt-16">
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/images/logo.png"
              alt="Stelo logo"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <div>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Mission Control
              </h3>
              <p className="text-[10px] text-primary">Stellar Network</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 font-headline text-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match
              ? item.match(currentPath)
              : currentPath === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={
                  isActive
                    ? "flex items-center gap-3 px-4 py-3 text-[#6366F1] bg-[#1a1b20] rounded-r-full font-bold ease-out duration-300"
                    : "flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-[#1a1b20]/50 rounded-r-full transition-all duration-300"
                }
              >
                <span className="material-symbols-outlined" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-6 pt-4 text-[10px] text-on-surface-variant/60 font-mono">
          v1.0 • Testnet
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────── */}
      <main className="lg:pl-64 pt-24 pb-12 px-6 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">{children}</div>
      </main>

      {/* ─── Mobile Bottom Nav ─────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel h-16 flex justify-around items-center px-4 z-50">
        {NAV_ITEMS.slice(0, 5).map((item, idx) => {
          const isActive = item.match
            ? item.match(currentPath)
            : currentPath === item.href;
          if (idx === 2) {
            return (
              <div key={item.href} className="relative -top-4">
                <Link
                  to="/products/new"
                  className="stellar-gradient p-4 rounded-full shadow-lg flex items-center justify-center"
                >
                  <span
                    className="material-symbols-outlined text-white"
                    aria-hidden
                  >
                    add
                  </span>
                </Link>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              to={item.href}
              className={
                isActive
                  ? "flex flex-col items-center gap-1 text-[#6366F1]"
                  : "flex flex-col items-center gap-1 text-slate-400"
              }
            >
              <span className="material-symbols-outlined" aria-hidden>
                {item.icon}
              </span>
              <span className="text-[10px] font-bold uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
