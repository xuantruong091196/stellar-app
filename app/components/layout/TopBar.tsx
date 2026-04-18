import { Link, useLocation, Form } from "@remix-run/react";
import { motion } from "framer-motion";
import { NotificationBell } from "~/components/NotificationBell";
import { truncateAddress } from "~/lib/stellar";
import { getAllNavItems } from "~/components/layout/Sidebar";

const SPRING = { type: "spring", stiffness: 300, damping: 25 } as const;

interface TopBarProps {
  userAddress: string | null;
  sidebarExpanded: boolean;
}

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const navItems = getAllNavItems();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [{ label: "Stelo", href: "/" }];

  const crumbs: { label: string; href: string }[] = [{ label: "Stelo", href: "/" }];

  // Map the first segment to a nav item label
  const firstSegment = segments[0];
  const navMatch = navItems.find((item) => item.href === `/${firstSegment}`);
  const firstLabel = navMatch ? navMatch.label : firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);

  crumbs.push({ label: firstLabel, href: `/${firstSegment}` });

  // Additional segments: capitalise and include
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const label = seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href: "/" + segments.slice(0, i + 1).join("/") });
  }

  return crumbs;
}

export function TopBar({ userAddress, sidebarExpanded }: TopBarProps) {
  const { pathname } = useLocation();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <motion.header
      animate={{ left: sidebarExpanded ? 220 : 64 }}
      transition={SPRING}
      className="fixed top-0 right-0 z-50 h-14 flex items-center px-4 gap-4 bg-[#0d0e12]/80 backdrop-blur-md border-b border-white/[0.04]"
    >
      {/* Left: breadcrumbs (desktop) / page title (mobile) */}
      <div className="flex-1 min-w-0">
        {/* Desktop breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1 text-sm">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <span key={crumb.href} className="flex items-center gap-1">
                {idx > 0 && (
                  <span className="text-white/20 select-none" aria-hidden>
                    /
                  </span>
                )}
                {isLast ? (
                  <span className="text-[#a5b4fc] font-medium truncate">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="text-on-surface-variant hover:text-white transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Mobile: just last crumb as page title */}
        <span className="lg:hidden text-sm font-semibold text-[#a5b4fc] truncate">
          {crumbs[crumbs.length - 1]?.label ?? "Stelo"}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {userAddress ? (
          <>
            <NotificationBell walletAddress={userAddress} />

            {/* Wallet chip */}
            <div className="flex items-center gap-2 bg-white/[0.06] px-3 py-1.5 rounded-full border border-white/[0.06]">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6366f1] to-[#22d3ee] flex-shrink-0" />
              <span className="font-mono text-xs text-white/60 hidden sm:block">
                {truncateAddress(userAddress)}
              </span>
            </div>

            {/* Logout */}
            <Form method="post" action="/logout">
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/[0.06] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  logout
                </span>
              </button>
            </Form>
          </>
        ) : (
          <Link
            to="/login"
            className="text-xs font-bold text-white bg-[#6366f1] hover:bg-[#4f46e5] px-4 py-1.5 rounded-full transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </motion.header>
  );
}
