import { Badge } from "@shopify/polaris";
import type { ProviderOrderStatus } from "~/lib/types";

interface ProviderOrderStatusBadgeProps {
  status: ProviderOrderStatus | string;
}

const PROVIDER_ORDER_STATUS_LABELS: Record<ProviderOrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  printing: "Printing",
  quality_check: "Quality Check",
  packing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
};

const toneMap: Record<ProviderOrderStatus, "info" | "attention" | "warning" | "success"> = {
  pending: "info",
  accepted: "attention",
  printing: "warning",
  quality_check: "warning",
  packing: "attention",
  shipped: "info",
  delivered: "success",
};

export function ProviderOrderStatusBadge({ status }: ProviderOrderStatusBadgeProps) {
  const label = PROVIDER_ORDER_STATUS_LABELS[status as ProviderOrderStatus] || status;
  const tone = toneMap[status as ProviderOrderStatus] || "info";
  return <Badge tone={tone}>{label}</Badge>;
}
