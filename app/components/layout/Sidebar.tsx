import { Link, useLocation } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";

const SPRING = { type: "spring", stiffness: 300, damping: 25 } as const;

interface NavItem {
  label: string;
  icon: string;
  href: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
      { label: "Products", icon: "inventory_2", href: "/products" },
      { label: "Orders", icon: "shopping_cart", href: "/orders" },
      { label: "Trends", icon: "trending_up", href: "/trends" },
      { label: "Designs", icon: "palette", href: "/designs" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Escrow", icon: "account_balance_wallet", href: "/escrow" },
      { label: "Providers", icon: "local_shipping", href: "/providers" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", icon: "notifications", href: "/notifications" },
      { label: "Settings", icon: "settings", href: "/settings" },
    ],
  },
];

export function getAllNavItems(): NavItem[] {
  return NAV_GROUPS.flatMap((g) => g.items);
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 64 }}
      transition={SPRING}
      className="hidden lg:flex flex-col fixed left-0 top-14 bottom-0 z-40 bg-[#0d0e12] border-r border-white/[0.04] overflow-hidden"
    >
      {/* Nav groups */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-1">
            {/* Group title */}
            <motion.div
              animate={{ opacity: expanded ? 1 : 0, height: expanded ? "auto" : 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <span className="block px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30 select-none">
                {group.title}
              </span>
            </motion.div>

            {/* Items */}
            {group.items.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <div key={item.href} className="relative mx-2 group">
                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-[#6366f1]/15"
                      transition={SPRING}
                    />
                  )}
                  {/* Active left border */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-[#6366f1]" />
                  )}

                  <Link
                    to={item.href}
                    className={[
                      "relative flex items-center gap-3 px-3 h-10 rounded-xl transition-colors",
                      active
                        ? "text-[#a5b4fc]"
                        : "text-[#8b8ba0] hover:text-white hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0" aria-hidden>
                      {item.icon}
                    </span>

                    {/* Label */}
                    <motion.span
                      animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
                      transition={SPRING}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  </Link>

                  {/* Tooltip (collapsed only) */}
                  {!expanded && (
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#1e1f26] text-white text-xs rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: version + toggle */}
      <div className="pb-3 flex flex-col items-center gap-1">
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[10px] font-mono text-white/20 mb-1 select-none"
            >
              v1.0 • Mainnet
            </motion.span>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={onToggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className="mx-2 w-10 h-10 rounded-xl flex items-center justify-center text-[#8b8ba0] hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={SPRING}
            className="material-symbols-outlined text-[20px]"
            aria-hidden
          >
            chevron_right
          </motion.span>
        </button>
      </div>
    </motion.aside>
  );
}
