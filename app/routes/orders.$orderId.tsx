import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Badge,
  Button,
  Banner,
  DataTable,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Divider,
  TextField,
  Spinner,
} from "@shopify/polaris";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { apiGet, apiPost } from "~/lib/api";
import type { Order, OrderStatus, ProviderOrder } from "~/lib/types";
import { ORDER_STATUS_LABELS } from "~/lib/types";
import { EscrowStatusBadge } from "~/components/EscrowStatusBadge";
import { ProviderOrderStatusBadge } from "~/components/ProviderOrderStatusBadge";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Order Detail" }];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { orderId } = params;
  if (!orderId) {
    throw new Response("Order ID is required", { status: 400 });
  }

  const res = await apiGet<Order>(`/orders/detail/${orderId}`);

  if (res.error) {
    throw new Response(res.error, { status: res.status || 500 });
  }

  // The order detail response includes providerOrders if they exist.
  // If the API does not yet include providerOrders in the response,
  // a dedicated endpoint like GET /orders/:orderId/provider-orders would be needed.
  const order = res.data!;
  const providerOrders: ProviderOrder[] = (order as Order & { providerOrders?: ProviderOrder[] }).providerOrders ?? [];

  return json({ order, providerOrders });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const { orderId } = params;

  if (!orderId) {
    return json({ error: "Order ID is required" }, { status: 400 });
  }

  switch (intent) {
    case "release": {
      const escrowId = formData.get("escrowId") as string;
      if (!escrowId) {
        return json({ error: "Escrow ID is required" }, { status: 400 });
      }
      const res = await apiPost(`/escrow/${escrowId}/release`, {});
      if (res.error) {
        return json({ error: res.error }, { status: res.status || 500 });
      }
      return json({ success: true, message: "Escrow funds released successfully" });
    }

    case "dispute": {
      const escrowId = formData.get("escrowId") as string;
      const reason = formData.get("reason") as string;
      if (!escrowId) {
        return json({ error: "Escrow ID is required" }, { status: 400 });
      }
      const res = await apiPost(`/escrow/${escrowId}/dispute`, {
        raisedBy: "merchant",
        reason: reason || "Dispute raised by merchant",
      });
      if (res.error) {
        return json({ error: res.error }, { status: res.status || 500 });
      }
      return json({ success: true, message: "Dispute opened successfully" });
    }

    case "cancel": {
      const res = await apiPost(`/orders/${orderId}/cancel`, {});
      if (res.error) {
        return json({ error: res.error }, { status: res.status || 500 });
      }
      return json({ success: true, message: "Order cancelled successfully" });
    }

    default:
      return json({ error: `Unknown intent: ${intent}` }, { status: 400 });
  }
}

const orderStatusTone: Record<OrderStatus, "warning" | "info" | "success" | "critical" | "attention"> = {
  PENDING: "warning",
  ESCROW_LOCKED: "warning",
  SENT_TO_PROVIDER: "info",
  IN_PRODUCTION: "info",
  SHIPPED: "success",
  DELIVERED: "success",
  ESCROW_RELEASED: "success",
  DISPUTED: "critical",
  CANCELLED: "critical",
  REFUNDED: "attention",
};

export default function OrderDetail() {
  const { order, providerOrders } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<{ error?: string; success?: boolean; message?: string }>();
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const isSubmitting = fetcher.state !== "idle";

  const shippingAddress = order.shippingAddress as Record<string, string> | null;

  const itemRows = (order.items ?? []).map((item) => [
    `${item.productType} — ${item.variant}`,
    item.id.slice(0, 8),
    item.quantity,
    `$${item.unitPrice.toFixed(2)}`,
  ]);

  return (
    <Page
      title={`Order #${order.shopifyOrderNumber}`}
      backAction={{ content: "Orders", onAction: () => navigate("/orders") }}
      subtitle={`Created ${new Date(order.createdAt).toLocaleDateString()}`}
      titleMetadata={
        <Badge tone={orderStatusTone[order.status] || "info"}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </Badge>
      }
    >
      <BlockStack gap="500">
        {fetcher.data?.error && (
          <Banner title="Action Failed" tone="critical" onDismiss={() => {}}>
            <p>{fetcher.data.error}</p>
          </Banner>
        )}

        {fetcher.data?.success && (
          <Banner title="Success" tone="success" onDismiss={() => {}}>
            <p>{fetcher.data.message}</p>
          </Banner>
        )}

        {showReleaseConfirm && order.escrow && (
          <Banner
            title="Confirm Escrow Release"
            tone="warning"
            onDismiss={() => setShowReleaseConfirm(false)}
          >
            <BlockStack gap="200">
              <Text as="p">
                This will release ${order.escrow.amountUsdc.toFixed(2)} USDC to the print provider.
                This action cannot be undone.
              </Text>
              <InlineStack gap="200">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="release" />
                  <input type="hidden" name="escrowId" value={order.escrow.id} />
                  <Button variant="primary" submit disabled={isSubmitting}>
                    {isSubmitting ? "Releasing..." : "Confirm Release"}
                  </Button>
                </fetcher.Form>
                <Button onClick={() => setShowReleaseConfirm(false)}>Cancel</Button>
              </InlineStack>
            </BlockStack>
          </Banner>
        )}

        {showDisputeConfirm && order.escrow && (
          <Banner
            title="Open Dispute"
            tone="critical"
            onDismiss={() => setShowDisputeConfirm(false)}
          >
            <BlockStack gap="200">
              <Text as="p">
                This will flag the escrow for review. Funds will remain locked until the dispute is resolved.
              </Text>
              <TextField
                label="Reason for dispute"
                value={disputeReason}
                onChange={setDisputeReason}
                multiline={3}
                autoComplete="off"
              />
              <InlineStack gap="200">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="dispute" />
                  <input type="hidden" name="escrowId" value={order.escrow.id} />
                  <input type="hidden" name="reason" value={disputeReason} />
                  <Button variant="primary" tone="critical" submit disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Confirm Dispute"}
                  </Button>
                </fetcher.Form>
                <Button onClick={() => setShowDisputeConfirm(false)}>Cancel</Button>
              </InlineStack>
            </BlockStack>
          </Banner>
        )}

        {showCancelConfirm && (
          <Banner
            title="Cancel Order"
            tone="critical"
            onDismiss={() => setShowCancelConfirm(false)}
          >
            <BlockStack gap="200">
              <Text as="p">
                Are you sure you want to cancel this order? This may trigger a refund.
              </Text>
              <InlineStack gap="200">
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="cancel" />
                  <Button variant="primary" tone="critical" submit disabled={isSubmitting}>
                    {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
                  </Button>
                </fetcher.Form>
                <Button onClick={() => setShowCancelConfirm(false)}>Keep Order</Button>
              </InlineStack>
            </BlockStack>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Order Items</Text>
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "numeric"]}
                  headings={["Product", "ID", "Qty", "Unit Price"]}
                  rows={itemRows}
                  totals={["", "", "", `$${order.totalUsdc.toFixed(2)}`]}
                />
                <BlockStack gap="100">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">Subtotal</Text>
                    <Text as="span" variant="bodySm">${order.subtotalUsdc.toFixed(2)}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">Platform Fee</Text>
                    <Text as="span" variant="bodySm">${order.platformFeeUsdc.toFixed(2)}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">Provider Pay</Text>
                    <Text as="span" variant="bodySm">${order.providerPayUsdc.toFixed(2)}</Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Shipping</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Tracking Number</Text>
                      <Text as="span" variant="bodyMd">
                        {order.trackingNumber || "Not yet available"}
                      </Text>
                    </InlineStack>
                    {order.trackingUrl && (
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Tracking URL</Text>
                        <Button variant="plain" url={order.trackingUrl} external>
                          Track Package
                        </Button>
                      </InlineStack>
                    )}
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Shipped At</Text>
                      <Text as="span" variant="bodyMd">
                        {order.shippedAt ? new Date(order.shippedAt).toLocaleDateString() : "—"}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Delivered At</Text>
                      <Text as="span" variant="bodyMd">
                        {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : "—"}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>

            {providerOrders.length > 0 && (
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Provider Orders</Text>
                    <Divider />
                    {providerOrders.map((po: ProviderOrder) => (
                      <BlockStack key={po.id} gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="h3" variant="headingSm">
                            {po.provider?.name || `Provider ${po.providerId.slice(0, 8)}`}
                          </Text>
                          <ProviderOrderStatusBadge status={po.status} />
                        </InlineStack>
                        <BlockStack gap="100">
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodySm" tone="subdued">Base Cost</Text>
                            <Text as="span" variant="bodySm">${po.totalBaseCost.toFixed(2)}</Text>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodySm" tone="subdued">Platform Fee</Text>
                            <Text as="span" variant="bodySm">${po.platformFee.toFixed(2)}</Text>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodySm" tone="subdued">Tracking</Text>
                            <Text as="span" variant="bodySm">
                              {po.trackingNumber || "Not yet available"}
                            </Text>
                          </InlineStack>
                          {po.trackingUrl && (
                            <InlineStack align="space-between">
                              <Text as="span" variant="bodySm" tone="subdued">Track</Text>
                              <Button variant="plain" url={po.trackingUrl} external>
                                Track Package
                              </Button>
                            </InlineStack>
                          )}
                          {po.shippedAt && (
                            <InlineStack align="space-between">
                              <Text as="span" variant="bodySm" tone="subdued">Shipped</Text>
                              <Text as="span" variant="bodySm">
                                {new Date(po.shippedAt).toLocaleDateString()}
                              </Text>
                            </InlineStack>
                          )}
                          {po.deliveredAt && (
                            <InlineStack align="space-between">
                              <Text as="span" variant="bodySm" tone="subdued">Delivered</Text>
                              <Text as="span" variant="bodySm">
                                {new Date(po.deliveredAt).toLocaleDateString()}
                              </Text>
                            </InlineStack>
                          )}
                        </BlockStack>
                        <Divider />
                      </BlockStack>
                    ))}
                  </BlockStack>
                </Card>
              </Box>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            {order.escrow && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Escrow</Text>
                  <Divider />
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Status</Text>
                      <EscrowStatusBadge status={order.escrow.status} />
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Amount</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        ${order.escrow.amountUsdc.toFixed(2)}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Platform Fee</Text>
                      <Text as="span" variant="bodySm">${order.escrow.platformFee.toFixed(2)}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Provider Amount</Text>
                      <Text as="span" variant="bodySm">${order.escrow.providerAmount.toFixed(2)}</Text>
                    </InlineStack>
                    {order.escrow.lockedAt && (
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Locked At</Text>
                        <Text as="span" variant="bodySm">
                          {new Date(order.escrow.lockedAt).toLocaleDateString()}
                        </Text>
                      </InlineStack>
                    )}
                    {order.escrow.lockTxHash && (
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Lock Tx</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {order.escrow.lockTxHash.slice(0, 12)}...
                        </Text>
                      </InlineStack>
                    )}
                    {order.escrow.releaseTxHash && (
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Release Tx</Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {order.escrow.releaseTxHash.slice(0, 12)}...
                        </Text>
                      </InlineStack>
                    )}
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Expires</Text>
                      <Text as="span" variant="bodySm">
                        {new Date(order.escrow.expiresAt).toLocaleDateString()}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                  <Divider />
                  <InlineStack gap="200">
                    {order.escrow.status === "LOCKED" && (
                      <Button variant="primary" onClick={() => setShowReleaseConfirm(true)}>
                        Release Funds
                      </Button>
                    )}
                    {(order.escrow.status === "LOCKED" || order.escrow.status === "LOCKING") && (
                      <Button variant="primary" tone="critical" onClick={() => setShowDisputeConfirm(true)}>
                        Dispute
                      </Button>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card>
            )}

            {!order.escrow && (
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Escrow</Text>
                  <Text as="p" variant="bodySm" tone="subdued">No escrow record for this order.</Text>
                </BlockStack>
              </Card>
            )}

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Customer</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">{order.customerName}</Text>
                    {shippingAddress && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {[
                          shippingAddress.address1,
                          shippingAddress.city,
                          shippingAddress.province,
                          shippingAddress.zip,
                          shippingAddress.country,
                        ].filter(Boolean).join(", ")}
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Actions</Text>
                  <BlockStack gap="200">
                    {order.status === "PENDING" && (
                      <Button tone="critical" onClick={() => setShowCancelConfirm(true)}>
                        Cancel Order
                      </Button>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
