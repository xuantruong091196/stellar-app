import type { ReactNode } from "react";
import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { MobileDrawer } from "./MobileDrawer";
import { useSidebarState } from "~/hooks/useSidebarState";

interface AppShellProps {
  children: ReactNode;
  userAddress: string | null;
}

export function AppShell({ children, userAddress }: AppShellProps) {
  const { expanded, toggle } = useSidebarState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <Sidebar expanded={expanded} onToggle={toggle} />
      <TopBar userAddress={userAddress} sidebarExpanded={expanded} />

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-3 left-4 z-50 w-9 h-9 rounded-xl bg-surface-container-low/80 backdrop-blur flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main
        className="pt-20 pb-20 lg:pb-12 px-4 sm:px-6 min-h-screen transition-[margin-left] duration-300 ease-out"
        style={{ marginLeft: expanded ? 220 : 64 }}
      >
        <div className="max-w-7xl mx-auto space-y-8">
          {children}
        </div>
      </main>

      {/* Override margin on mobile */}
      <style>{`@media (max-width: 1023px) { main { margin-left: 0 !important; } }`}</style>

      <MobileNav />
    </>
  );
}
