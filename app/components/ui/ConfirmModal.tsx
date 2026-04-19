import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const isDanger = state?.options.variant === "danger";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state && (
          <>
            <motion.div
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
            />
            <motion.div
              className="fixed top-[30%] left-1/2 z-[301] w-full max-w-sm -translate-x-1/2"
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="bg-[#1a1b20] rounded-2xl border border-white/[0.08] shadow-2xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDanger ? "bg-red-500/15" : "bg-indigo-500/15"}`}>
                    <span className={`material-symbols-outlined text-xl ${isDanger ? "text-red-400" : "text-indigo-400"}`}>
                      {isDanger ? "warning" : "help"}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#f0f0f5]">{state.options.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{state.options.message}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-white/[0.04] transition-colors"
                  >
                    {state.options.cancelLabel || "Cancel"}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      isDanger
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-400/20"
                        : "stellar-gradient text-white hover:brightness-110"
                    }`}
                  >
                    {state.options.confirmLabel || "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
