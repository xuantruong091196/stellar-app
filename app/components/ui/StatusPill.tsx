import type { EscrowStatus, OrderStatus, MerchantProductStatus } from "~/lib/types";
import { ESCROW_STATUS_LABELS, ORDER_STATUS_LABELS } from "~/lib/types";

type PillTone =
  | "amber"
  | "indigo"
  | "cyan"
  | "green"
  | "red"
  | "slate";

const TONE_CLASSES: Record<PillTone, string> = {
  amber:
    "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  indigo:
    "bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20",
  cyan:
    "bg-[#5de6ff]/10 text-[#5de6ff] border border-[#5de6ff]/20",
  green:
    "bg-green-400/10 text-green-400 border border-green-400/20",
  red: "bg-red-400/10 text-red-400 border border-red-400/20",
  slate:
    "bg-slate-400/10 text-slate-400 border border-slate-400/20",
};

export function Pill({
  tone,
  children,
  className = "",
}: {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const ESCROW_TONE: Record<EscrowStatus, PillTone> = {
  LOCKING: "slate",
  LOCKED: "amber",
  RELEASING: "indigo",
  RELEASED: "green",
  DISPUTED: "red",
  REFUNDED: "slate",
  EXPIRED: "amber",
};

const ORDER_TONE: Record<OrderStatus, PillTone> = {
  PENDING: "slate",
  ESCROW_LOCKED: "amber",
  SENT_TO_PROVIDER: "indigo",
  IN_PRODUCTION: "indigo",
  SHIPPED: "cyan",
  DELIVERED: "green",
  ESCROW_RELEASED: "green",
  DISPUTED: "red",
  CANCELLED: "slate",
  REFUNDED: "slate",
};

const PRODUCT_TONE: Record<MerchantProductStatus, PillTone> = {
  draft: "slate",
  publishing: "indigo",
  published: "green",
  error: "red",
};

export function EscrowPill({ status }: { status: EscrowStatus }) {
  return <Pill tone={ESCROW_TONE[status]}>{ESCROW_STATUS_LABELS[status]}</Pill>;
}

export function OrderPill({ status }: { status: OrderStatus }) {
  return <Pill tone={ORDER_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Pill>;
}

export function ProductPill({ status }: { status: MerchantProductStatus }) {
  return <Pill tone={PRODUCT_TONE[status]}>{status}</Pill>;
}
