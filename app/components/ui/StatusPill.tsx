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
  LOCK_FAILED: "red",
  LOCKED: "amber",
  RELEASING: "indigo",
  RELEASED: "green",
  DISPUTED: "red",
  REFUNDING: "indigo",
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

type ProvenanceStatus = 'MINTING' | 'MINTED' | 'MINT_FAILED' | 'BURNED';

const PROVENANCE_TONE: Record<ProvenanceStatus, PillTone> = {
  MINTING: 'amber',
  MINTED: 'green',
  MINT_FAILED: 'red',
  BURNED: 'slate',
};

const PROVENANCE_LABELS: Record<ProvenanceStatus, string> = {
  MINTING: 'Minting…',
  MINTED: 'Minted',
  MINT_FAILED: 'Mint Failed',
  BURNED: 'Burned',
};

export function ProvenancePill({
  status,
  assetCode,
}: {
  status: ProvenanceStatus;
  assetCode?: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Pill tone={PROVENANCE_TONE[status]}>{PROVENANCE_LABELS[status]}</Pill>
      {status === 'MINTED' && assetCode && (
        <span className="text-[10px] font-mono text-on-surface-variant/60 truncate max-w-[80px]">
          {assetCode}
        </span>
      )}
    </div>
  );
}
