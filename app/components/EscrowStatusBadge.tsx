import { Badge } from "@shopify/polaris";
import type { EscrowStatus } from "~/lib/types";
import { ESCROW_STATUS_LABELS } from "~/lib/types";

interface EscrowStatusBadgeProps {
  status: EscrowStatus | string;
}

const toneMap: Record<string, "warning" | "success" | "critical" | "info" | "attention"> = {
  LOCKING: "info",
  LOCKED: "warning",
  RELEASING: "info",
  RELEASED: "success",
  DISPUTED: "critical",
  REFUNDED: "attention",
  EXPIRED: "attention",
};

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const label = ESCROW_STATUS_LABELS[status as EscrowStatus] || status;
  const tone = toneMap[status] || "info";
  return <Badge tone={tone}>{label}</Badge>;
}
