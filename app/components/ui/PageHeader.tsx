import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-on-surface-variant font-headline">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-wrap">{actions}</div>
      )}
    </header>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface-container-low rounded-2xl ${className}`}>
      {title && (
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold font-headline">{title}</h2>
          {action}
        </div>
      )}
      <div className={title ? "px-6 pb-6" : "p-6"}>{children}</div>
    </section>
  );
}

export function StatCard({
  icon,
  iconColor,
  label,
  value,
  hint,
  hintColor = "text-on-surface-variant",
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string | number;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <div className="bg-surface-container-low p-6 rounded-2xl space-y-4 hover:bg-surface-container-high transition-colors">
      <div className="flex justify-between items-start">
        <span
          className={`material-symbols-outlined ${iconColor}`}
          aria-hidden
        >
          {icon}
        </span>
        {hint && (
          <span
            className={`text-xs font-bold ${hintColor} uppercase tracking-tighter`}
          >
            {hint}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-headline font-bold text-on-surface">
          {value}
        </p>
        <h4 className="text-on-surface-variant text-sm font-label">{label}</h4>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6">
      <span
        className="material-symbols-outlined text-6xl text-on-surface-variant/40 mb-4"
        aria-hidden
      >
        {icon}
      </span>
      <h3 className="text-lg font-bold font-headline mb-2">{title}</h3>
      {description && (
        <p className="text-on-surface-variant text-sm mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
