import { useState } from "react";
import { Link, useLocation } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";

const FAB_SPRING = { type: "spring", stiffness: 400, damping: 25 } as const;

interface TabItem {
  label: string;
  icon: string;
  href: string;
}

const TABS: TabItem[] = [
  { label: "Home", icon: "dashboard", href: "/dashboard" },
  { label: "Products", icon: "inventory_2", href: "/products" },
  { label: "Orders", icon: "shopping_cart", href: "/orders" },
  { label: "Escrow", icon: "account_balance_wallet", href: "/escrow" },
];

interface FabAction {
  label: string;
  icon: string;
  href: string;
}

const FAB_ACTIONS: FabAction[] = [
  { label: "New Product", icon: "inventory_2", href: "/products/new" },
  { label: "Upload Design", icon: "palette", href: "/designs/upload" },
];

export function MobileNav() {
  const { pathname } = useLocation();
  const [fabOpen, setFabOpen] = useState(false);

  const half = Math.floor(TABS.length / 2);
  const leftTabs = TABS.slice(0, half);
  const rightTabs = TABS.slice(half);

  return (
    <>
      {/* FAB backdrop overlay */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="fab-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB action items */}
      <AnimatePresence>
        {fabOpen &&
          FAB_ACTIONS.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 0, x: "-50%" }}
              animate={{ opacity: 1, y: -(i + 1) * 60, x: "-50%" }}
              exit={{ opacity: 0, y: 0, x: "-50%" }}
              transition={FAB_SPRING}
              className="lg:hidden fixed bottom-12 left-1/2 z-[62] flex items-center gap-2"
              style={{ transformOrigin: "center bottom" }}
            >
              <Link
                to={action.href}
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1b20] border border-white/[0.08] text-white text-sm font-medium shadow-xl whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px] text-[#a5b4fc]" aria-hidden>
                  {action.icon}
                </span>
                {action.label}
              </Link>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-[#0d0e12]/95 backdrop-blur-xl border-t border-white/[0.04] flex items-center">
        {/* Left tabs */}
        <div className="flex flex-1 justify-around">
          {leftTabs.map((tab) => {
            const active = tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <span
                  className={[
                    "material-symbols-outlined text-[22px] transition-colors",
                    active ? "text-[#a5b4fc]" : "text-[#6b6b80]",
                  ].join(" ")}
                  aria-hidden
                >
                  {tab.icon}
                </span>
                <span
                  className={[
                    "text-[10px] font-medium transition-colors",
                    active ? "text-[#a5b4fc]" : "text-[#6b6b80]",
                  ].join(" ")}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Center FAB */}
        <div className="flex items-end justify-center w-16 -mt-5">
          <button
            type="button"
            aria-label={fabOpen ? "Close actions" : "Open actions"}
            onClick={() => setFabOpen((v) => !v)}
            className="w-11 h-11 rounded-full stellar-gradient flex items-center justify-center shadow-lg shadow-[#6366f1]/30 z-[62] relative"
          >
            <motion.span
              animate={{ rotate: fabOpen ? 45 : 0 }}
              transition={FAB_SPRING}
              className="material-symbols-outlined text-white text-[22px]"
              aria-hidden
            >
              add
            </motion.span>
          </button>
        </div>

        {/* Right tabs */}
        <div className="flex flex-1 justify-around">
          {rightTabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <span
                  className={[
                    "material-symbols-outlined text-[22px] transition-colors",
                    active ? "text-[#a5b4fc]" : "text-[#6b6b80]",
                  ].join(" ")}
                  aria-hidden
                >
                  {tab.icon}
                </span>
                <span
                  className={[
                    "text-[10px] font-medium transition-colors",
                    active ? "text-[#a5b4fc]" : "text-[#6b6b80]",
                  ].join(" ")}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
