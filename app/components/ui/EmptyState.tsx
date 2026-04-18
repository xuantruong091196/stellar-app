import { Link } from "@remix-run/react";

interface EmptyStateProps { icon: string; title: string; description: string; actionLabel?: string; actionHref?: string; }

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-on-surface-variant/50">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-[#f0f0f5] mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link to={actionHref} className="stellar-gradient text-white px-6 py-2.5 rounded-full text-sm font-bold hover:brightness-110 transition-all">{actionLabel}</Link>
      )}
    </div>
  );
}
