import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleProps { title: string; children: ReactNode; defaultOpen?: boolean; }

export function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors">
        <span className="text-sm font-semibold text-[#f0f0f5]">{title}</span>
        <motion.span className="material-symbols-outlined text-[18px] text-on-surface-variant" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>expand_more</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-6 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
