import { Page, Layout, Card, DataTable, Badge, Text, BlockStack, InlineStack, InlineGrid, Box, Banner, Spinner } from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import type { Order, Escrow, PaginatedResponse, OrderStatus, EscrowStatus } from "~/lib/types";
import { ORDER_STATUS_LABELS, ESCROW_STATUS_LABELS } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Dashboard" }];
};

const STORE_ID = "demo-store";

export async function loader() {
  const [ordersRes, escrowsRes] = await Promise.all([
    apiGet<PaginatedResponse<Order>>(`/orders/${STORE_ID}?limit=5`),
    apiGet<PaginatedResponse<Escrow>>(`/escrow/store/${STORE_ID}?limit=5`),
  ]);

  // Compute order summary from orders data
  const orders = ordersRes.data?.data ?? [];
  const orderSummary = {
    pending: orders.filter((o) => o.status === "PENDING" || o.status === "ESCROW_LOCKED").length,
    inProduction: orders.filter((o) => o.status === "IN_PRODUCTION" || o.status === "SENT_TO_PROVIDER").length,
    shipped: orders.filter((o) => o.status === "SHIPPED" || o.status === "DELIVERED").length,
  };

  const totalOrders = ordersRes.data?.meta?.total ?? 0;

  return json({
    orders,
    escrows: escrowsRes.data?.data ?? [],
    orderSummary,
    totalOrders,
    error: ordersRes.error || escrowsRes.error || null,
  });
}

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, "warning" | "success" | "critical" | "info"> = {
    LOCKING: "info",
    LOCKED: "warning",
    RELEASING: "info",
    RELEASED: "success",
    DISPUTED: "critical",
    REFUNDED: "info",
    EXPIRED: "warning",
  };
  const label = ESCROW_STATUS_LABELS[status as EscrowStatus] || status;
  return <Badge tone={toneMap[status] || "info"}>{label}</Badge>;
}

function SummaryCard({ title, count, status }: { title: string; count: number; status: string }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">{title}</Text>
        <Text as="p" variant="headingXl">{count}</Text>
        <Badge tone={status as "warning" | "success" | "info"}>{title}</Badge>
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { escrows, orderSummary, totalOrders, error } = useLoaderData<typeof loader>();

  const escrowRows = escrows.map((escrow) => [
    escrow.id,
    escrow.orderId,
    `$${escrow.amountUsdc.toFixed(2)}`,
    <StatusBadge key={escrow.id} status={escrow.status} />,
    new Date(escrow.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page title="StellarPOD Dashboard">
      <BlockStack gap="500">
        {error && (
          <Banner title="Error loading data" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        <InlineGrid columns={3} gap="400">
          <SummaryCard title="Pending" count={orderSummary.pending} status="warning" />
          <SummaryCard title="In Production" count={orderSummary.inProduction} status="info" />
          <SummaryCard title="Shipped" count={orderSummary.shipped} status="success" />
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Recent Escrows</Text>
                {escrowRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "numeric", "text", "text"]}
                    headings={["Escrow ID", "Order", "Amount", "Status", "Date"]}
                    rows={escrowRows}
                  />
                ) : (
                  <Text as="p" variant="bodySm" tone="subdued">No escrows found.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Wallet Balance</Text>
                <BlockStack gap="200">
                  <Text as="p" variant="headingXl">$0.00</Text>
                  <Text as="p" variant="bodySm" tone="subdued">USDC on Stellar</Text>
                </BlockStack>
                <Box paddingBlockStart="200">
                  <InlineStack gap="200">
                    <Badge tone="info">Testnet</Badge>
                  </InlineStack>
                </Box>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Quick Stats</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Total Orders</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold">{totalOrders}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Active Designs</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold">—</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Connected Providers</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold">—</Text>
                    </InlineStack>
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
