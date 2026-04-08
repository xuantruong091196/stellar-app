import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Box,
} from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { EscrowStatusBadge } from "~/components/EscrowStatusBadge";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Escrow" }];
};

// TODO: Replace with loader data from API
const escrowSummary = {
  totalLocked: "$245.50",
  totalReleased: "$1,230.00",
  totalDisputed: "$32.00",
  activeCount: 5,
};

const activeEscrows = [
  { id: "ESC-010", orderId: "ORD-1042", provider: "PrintMaster Co.", amount: "$64.97", status: "locked" as const, lockedAt: "2026-04-07", expiresAt: "2026-04-21" },
  { id: "ESC-009", orderId: "ORD-1041", amount: "$24.99", provider: "EuroPrint GmbH", status: "locked" as const, lockedAt: "2026-04-07", expiresAt: "2026-04-21" },
  { id: "ESC-008", orderId: "ORD-1040", amount: "$49.98", provider: "PrintMaster Co.", status: "locked" as const, lockedAt: "2026-04-06", expiresAt: "2026-04-20" },
  { id: "ESC-007", orderId: "ORD-1038", amount: "$32.00", provider: "AsiaFab Ltd", status: "disputed" as const, lockedAt: "2026-04-04", expiresAt: "2026-04-18" },
  { id: "ESC-006", orderId: "ORD-1036", amount: "$73.56", provider: "NordicCraft AB", status: "locked" as const, lockedAt: "2026-04-03", expiresAt: "2026-04-17" },
];

const releaseHistory = [
  { id: "ESC-005", orderId: "ORD-1035", provider: "PrintMaster Co.", amount: "$42.00", releasedAt: "2026-04-03" },
  { id: "ESC-004", orderId: "ORD-1032", provider: "EuroPrint GmbH", amount: "$88.50", releasedAt: "2026-04-01" },
  { id: "ESC-003", orderId: "ORD-1028", provider: "AsiaFab Ltd", amount: "$120.00", releasedAt: "2026-03-28" },
  { id: "ESC-002", orderId: "ORD-1025", provider: "PrintMaster Co.", amount: "$55.00", releasedAt: "2026-03-25" },
];

function SummaryCard({ title, value, tone }: { title: string; value: string; tone?: "success" | "warning" | "critical" }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">{title}</Text>
        <Text as="p" variant="headingXl">{value}</Text>
        {tone && <Badge tone={tone}>{title}</Badge>}
      </BlockStack>
    </Card>
  );
}

export default function Escrow() {
  const activeRows = activeEscrows.map((escrow) => [
    escrow.id,
    escrow.orderId,
    escrow.provider,
    escrow.amount,
    <EscrowStatusBadge key={escrow.id} status={escrow.status} />,
    escrow.lockedAt,
    escrow.expiresAt,
  ]);

  const historyRows = releaseHistory.map((escrow) => [
    escrow.id,
    escrow.orderId,
    escrow.provider,
    escrow.amount,
    <Badge key={escrow.id} tone="success">Released</Badge>,
    escrow.releasedAt,
  ]);

  return (
    <Page title="Escrow Dashboard" subtitle="Manage Stellar blockchain escrow payments">
      <BlockStack gap="500">
        <InlineGrid columns={4} gap="400">
          <SummaryCard title="Total Locked" value={escrowSummary.totalLocked} tone="warning" />
          <SummaryCard title="Total Released" value={escrowSummary.totalReleased} tone="success" />
          <SummaryCard title="Total Disputed" value={escrowSummary.totalDisputed} tone="critical" />
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Active Escrows</Text>
              <Text as="p" variant="headingXl">{escrowSummary.activeCount}</Text>
              <Badge tone="info">Active</Badge>
            </BlockStack>
          </Card>
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Active Escrows</Text>
                  <Badge tone="warning">{activeEscrows.length} active</Badge>
                </InlineStack>
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric", "text", "text", "text"]}
                  headings={["Escrow ID", "Order", "Provider", "Amount", "Status", "Locked", "Expires"]}
                  rows={activeRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Release History</Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
                  headings={["Escrow ID", "Order", "Provider", "Amount", "Status", "Released"]}
                  rows={historyRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
