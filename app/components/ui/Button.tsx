import { Link } from "@remix-run/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "stellar-gradient text-white shadow-lg hover:brightness-110",
  secondary:
    "bg-surface-container-high text-primary hover:bg-surface-container-highest",
  ghost:
    "bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low",
  danger:
    "bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20",
};

const BASE =
  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: string;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  icon,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-base" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: Variant;
  icon?: string;
  children?: ReactNode;
  className?: string;
}

export function LinkButton({
  to,
  variant = "primary",
  icon,
  children,
  className = "",
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-base" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}
