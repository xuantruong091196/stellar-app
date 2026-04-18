import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";

interface Command {
  label: string;
  icon: string;
  href: string;
  keywords: string[];
}

const COMMANDS: Command[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard", keywords: ["home", "overview"] },
  { label: "Products", icon: "inventory_2", href: "/products", keywords: ["catalog", "items"] },
  { label: "New Product", icon: "add_box", href: "/products/new", keywords: ["create", "add"] },
  { label: "Orders", icon: "shopping_cart", href: "/orders", keywords: ["sales", "purchases"] },
  { label: "Designs", icon: "palette", href: "/designs", keywords: ["art", "upload"] },
  { label: "Upload Design", icon: "cloud_upload", href: "/designs/upload", keywords: ["upload", "add"] },
  { label: "Escrow", icon: "account_balance_wallet", href: "/escrow", keywords: ["funds", "usdc", "wallet"] },
  { label: "Providers", icon: "local_shipping", href: "/providers", keywords: ["print", "fulfillment"] },
  { label: "Notifications", icon: "notifications", href: "/notifications", keywords: ["alerts", "messages"] },
  { label: "Settings", icon: "settings", href: "/settings", keywords: ["config", "preferences"] },
];

function fuzzyMatch(query: string, command: Command): boolean {
  const q = query.toLowerCase();
  if (command.label.toLowerCase().includes(q)) return true;
  if (command.href.toLowerCase().includes(q)) return true;
  return command.keywords.some((kw) => kw.includes(q));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = useMemo(
    () => (query ? COMMANDS.filter((c) => fuzzyMatch(query, c)) : COMMANDS),
    [query],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      navigate(href);
    },
    [close, navigate],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      // Small delay so the input is mounted before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          go(filtered[selectedIndex].href);
        }
      }
    },
    [close, filtered, selectedIndex, go],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg bg-surface-container rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-on-surface-variant">
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages..."
                className="flex-1 bg-transparent text-on-surface text-sm outline-none placeholder:text-on-surface-variant/50"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] text-on-surface-variant/50 bg-surface-container-high px-2 py-1 rounded font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-on-surface-variant">
                  No results found
                </div>
              ) : (
                filtered.map((cmd, idx) => (
                  <button
                    key={cmd.href}
                    onClick={() => go(cmd.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors ${
                      idx === selectedIndex
                        ? "bg-primary/10 text-on-surface"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-xl ${
                        idx === selectedIndex ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {cmd.icon}
                    </span>
                    <span className="text-sm font-medium">{cmd.label}</span>
                    <span className="ml-auto text-[10px] font-mono text-on-surface-variant/40">
                      {cmd.href}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-outline-variant/10 flex items-center gap-4 text-[10px] text-on-surface-variant/40">
              <span className="flex items-center gap-1">
                <kbd className="bg-surface-container-high px-1.5 py-0.5 rounded font-mono">
                  ↑↓
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-surface-container-high px-1.5 py-0.5 rounded font-mono">
                  ↵
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-surface-container-high px-1.5 py-0.5 rounded font-mono">
                  esc
                </kbd>
                close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
