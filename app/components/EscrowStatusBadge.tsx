import { Badge } from "@shopify/polaris";

type EscrowStatus = "locked" | "released" | "disputed" | "expired" | "pending";

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
}

const statusConfig: Record<EscrowStatus, { label: string; tone: "warning" | "success" | "critical" | "info" | "attention" }> = {
  locked: { label: "Locked", tone: "warning" },
  released: { label: "Released", tone: "success" },
  disputed: { label: "Disputed", tone: "critical" },
  expired: { label: "Expired", tone: "attention" },
  pending: { label: "Pending", tone: "info" },
};

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, tone: "info" as const };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
