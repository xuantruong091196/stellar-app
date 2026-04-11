interface ExpandablePanelProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ExpandablePanel({
  isOpen,
  title,
  onClose,
  children,
}: ExpandablePanelProps) {
  return (
    <div
      className={`flex-shrink-0 bg-surface-container-low rounded-2xl overflow-hidden transition-all duration-200 ease-out ${
        isOpen ? "w-[320px] opacity-100 p-3" : "w-0 opacity-0 p-0"
      }`}
    >
      {isOpen && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-container-high transition-colors"
              title="Close panel"
            >
              <span className="material-symbols-outlined text-sm text-on-surface-variant">
                close
              </span>
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
