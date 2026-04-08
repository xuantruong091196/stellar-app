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
  Button,
  Banner,
} from "@shopify/polaris";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { EscrowStatusBadge } from "~/components/EscrowStatusBadge";
import { apiGet, apiPost } from "~/lib/api";
import type { Escrow, PaginatedResponse, EscrowStatus } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Escrow" }];
};

const STORE_ID = "demo-store";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const result = await apiGet<PaginatedResponse<Escrow>>(
    `/escrow/store/${STORE_ID}?page=${page}&limit=20`
  );

  if (result.error || !result.data) {
    return json({
      escrows: [] as Escrow[],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      summary: { totalLocked: 0, totalReleased: 0, totalDisputed: 0, activeCount: 0 },
      error: result.error || "Failed to load escrows",
    });
  }

  const allEscrows = result.data.data;

  // Compute summary stats from loaded data
  const summary = allEscrows.reduce(
    (acc, escrow) => {
      if (escrow.status === "LOCKED" || escrow.status === "LOCKING") {
        acc.totalLocked += escrow.amountUsdc;
        acc.activeCount += 1;
      }
      if (escrow.status === "RELEASED" || escrow.status === "RELEASING") {
        acc.totalReleased += escrow.amountUsdc;
      }
      if (escrow.status === "DISPUTED") {
        acc.totalDisputed += escrow.amountUsdc;
        acc.activeCount += 1;
      }
      return acc;
    },
    { totalLocked: 0, totalReleased: 0, totalDisputed: 0, activeCount: 0 }
  );

  return json({
    escrows: allEscrows,
    meta: result.data.meta,
    summary,
    error: null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "release") {
    const escrowId = formData.get("escrowId") as string;
    if (!escrowId) {
      return json({ success: false, error: "Missing escrow ID" }, { status: 400 });
    }

    const result = await apiPost(`/escrow/${escrowId}/release`, {});
    if (result.error) {
      return json({ success: false, error: result.error }, { status: result.status || 500 });
    }

    return json({ success: true, error: null });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

export default function EscrowDashboard() {
  const { escrows, summary, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const activeStatuses: EscrowStatus[] = ["LOCKED", "LOCKING", "DISPUTED"];
  const historyStatuses: EscrowStatus[] = ["RELEASED", "RELEASING", "REFUNDED", "EXPIRED"];

  const activeEscrows = escrows.filter((e) => activeStatuses.includes(e.status as EscrowStatus));
  const historyEscrows = escrows.filter((e) => historyStatuses.includes(e.status as EscrowStatus));

  const releaseInFlight = fetcher.state !== "idle";
  const fetcherData = fetcher.data as { success: boolean; error: string | null } | undefined;
  const releaseError = fetcherData && !fetcherData.success ? fetcherData.error : null;

  const activeRows = activeEscrows.map((escrow) => [
    escrow.id.slice(0, 8),
    escrow.orderId?.slice(0, 8) || "-",
    escrow.providerId || "-",
    formatUsd(escrow.amountUsdc),
    <EscrowStatusBadge key={escrow.id} status={escrow.status} />,
    formatDate(escrow.lockedAt),
    formatDate(escrow.expiresAt),
    escrow.status === "LOCKED" ? (
      <fetcher.Form method="post" key={`release-${escrow.id}`}>
        <input type="hidden" name="intent" value="release" />
        <input type="hidden" name="escrowId" value={escrow.id} />
        <Button variant="plain" submit disabled={releaseInFlight} size="slim">
          Release
        </Button>
      </fetcher.Form>
    ) : null,
  ]);

  const historyRows = historyEscrows.map((escrow) => [
    escrow.id.slice(0, 8),
    escrow.orderId?.slice(0, 8) || "-",
    escrow.providerId || "-",
    formatUsd(escrow.amountUsdc),
    <EscrowStatusBadge key={escrow.id} status={escrow.status} />,
    formatDate(escrow.releasedAt),
  ]);

  return (
    <Page title="Escrow Dashboard" subtitle="Manage Stellar blockchain escrow payments">
      <BlockStack gap="500">
        {error && (
          <Banner title="Error loading escrows" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        {releaseError && (
          <Banner title="Release failed" tone="critical">
            <p>{releaseError}</p>
          </Banner>
        )}

        <InlineGrid columns={4} gap="400">
          <SummaryCard title="Total Locked" value={formatUsd(summary.totalLocked)} tone="warning" />
          <SummaryCard title="Total Released" value={formatUsd(summary.totalReleased)} tone="success" />
          <SummaryCard title="Total Disputed" value={formatUsd(summary.totalDisputed)} tone="critical" />
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Active Escrows</Text>
              <Text as="p" variant="headingXl">{summary.activeCount}</Text>
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
                  <Badge tone="warning">{`${activeEscrows.length} active`}</Badge>
                </InlineStack>
                <DataTable
                  columnContentTypes={["text", "text", "text", "numeric", "text", "text", "text", "text"]}
                  headings={["Escrow ID", "Order", "Provider", "Amount", "Status", "Locked", "Expires", "Action"]}
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
