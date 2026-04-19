import { Link, useLocation } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";

const DRAWER_SPRING = { type: "spring", stiffness: 300, damping: 28 } as const;

interface DrawerNavItem {
  label: string;
  icon: string;
  href: string;
}

const DRAWER_ITEMS: DrawerNavItem[] = [
  { label: "Designs", icon: "palette", href: "/designs" },
  { label: "Providers", icon: "local_shipping", href: "/providers" },
  { label: "Notifications", icon: "notifications", href: "/notifications" },
  { label: "Settings", icon: "settings", href: "/settings" },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { pathname } = useLocation();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={DRAWER_SPRING}
            className="fixed left-0 top-0 bottom-0 z-[61] w-[280px] bg-[#0d0e12] border-r border-white/[0.04] flex flex-col"
          >
            {/* Logo header */}
            <div className="h-14 flex items-center px-5 border-b border-white/[0.04] flex-shrink-0">
              <Link to="/" onClick={onClose} className="flex items-center gap-3">
                <img
                  src="/images/logo.png"
                  alt="Stelo logo"
                  className="w-8 h-8 rounded-xl object-contain"
                />
                <span className="text-lg font-bold bg-gradient-to-r from-[#6366F1] to-[#22D3EE] bg-clip-text text-transparent">
                  Stelo
                </span>
              </Link>
            </div>

            {/* Nav items */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {DRAWER_ITEMS.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <div key={item.href} className="relative group">
                    {active && (
                      <div className="absolute inset-0 rounded-xl bg-[#6366f1]/15" />
                    )}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-[#6366f1]" />
                    )}
                    <Link
                      to={item.href}
                      onClick={onClose}
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
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>

            {/* Version footer */}
            <div className="px-5 pb-6 flex-shrink-0">
              <span className="text-[10px] font-mono text-white/20 select-none">
                v1.0 • Mainnet
              </span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
