import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Toast { id: string; message: string; type: "success" | "error" | "info"; }
interface ToastContextValue { toast: (message: string, type?: Toast["type"]) => void; }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now().toString(36);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const colors = { success: "border-green-500/30 bg-green-500/10", error: "border-red-500/30 bg-red-500/10", info: "border-indigo-500/30 bg-indigo-500/10" };
  const icons = { success: "check_circle", error: "error", info: "info" };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl ${colors[t.type]}`}>
              <span className="material-symbols-outlined text-[18px]">{icons[t.type]}</span>
              <span className="text-sm text-[#f0f0f5]">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
