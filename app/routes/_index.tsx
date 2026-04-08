import { Page, Layout, Card, DataTable, Badge, Text, BlockStack, InlineStack, InlineGrid, Box } from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Dashboard" }];
};

// TODO: Replace with real data from loader
const orderSummary = {
  pending: 12,
  inProduction: 8,
  shipped: 45,
};

const recentEscrows = [
  ["ESC-001", "Order #1042", "$24.99", "Locked", "2026-04-07"],
  ["ESC-002", "Order #1038", "$18.50", "Released", "2026-04-06"],
  ["ESC-003", "Order #1035", "$32.00", "Locked", "2026-04-05"],
  ["ESC-004", "Order #1030", "$15.75", "Disputed", "2026-04-04"],
  ["ESC-005", "Order #1028", "$42.00", "Released", "2026-04-03"],
];

function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, "warning" | "success" | "critical" | "info"> = {
    Locked: "warning",
    Released: "success",
    Disputed: "critical",
  };
  return <Badge tone={toneMap[status] || "info"}>{status}</Badge>;
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
  const escrowRows = recentEscrows.map(([id, order, amount, status, date]) => [
    id,
    order,
    amount,
    <StatusBadge key={id} status={status} />,
    date,
  ]);

  return (
    <Page title="StellarPOD Dashboard">
      <BlockStack gap="500">
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
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text", "text"]}
                  headings={["Escrow ID", "Order", "Amount", "Status", "Date"]}
                  rows={escrowRows}
                />
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
                      <Text as="span" variant="bodyMd" fontWeight="bold">65</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Active Designs</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold">23</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Connected Providers</Text>
                      <Text as="span" variant="bodyMd" fontWeight="bold">4</Text>
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
