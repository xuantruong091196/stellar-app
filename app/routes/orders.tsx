import { useCallback } from "react";
import {
  Page,
  Card,
  DataTable,
  Badge,
  Button,
  Filters,
  ChoiceList,
  BlockStack,
  Text,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import type { Order, PaginatedResponse, OrderStatus } from "~/lib/types";
import { ORDER_STATUS_LABELS, ESCROW_STATUS_LABELS } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Orders" }];
};

const STORE_ID = "demo-store";

const statusBadgeTone: Record<OrderStatus, "warning" | "info" | "success" | "critical" | "attention"> = {
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

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = url.searchParams.get("page") || "1";
  const query = url.searchParams.get("q") || "";

  let endpoint = `/orders/${STORE_ID}?page=${page}&limit=20`;
  if (status) {
    endpoint += `&status=${status}`;
  }

  const res = await apiGet<PaginatedResponse<Order>>(endpoint);

  return json({
    orders: res.data?.data ?? [],
    meta: res.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    error: res.error,
    query,
  });
}

export default function Orders() {
  const navigate = useNavigate();
  const { orders, meta, error, query } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get("status")?.split(",").filter(Boolean) ?? [];
  const queryValue = searchParams.get("q") || "";

  const handleStatusChange = useCallback((value: string[]) => {
    setSearchParams((prev) => {
      if (value.length > 0) {
        prev.set("status", value.join(","));
      } else {
        prev.delete("status");
      }
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const handleQueryChange = useCallback((value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set("q", value);
      } else {
        prev.delete("q");
      }
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const handleQueryClear = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete("q");
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  const handleFiltersClearAll = useCallback(() => {
    setSearchParams((prev) => {
      prev.delete("status");
      prev.delete("q");
      prev.set("page", "1");
      return prev;
    });
  }, [setSearchParams]);

  // Client-side query filtering (search by customer name or shopify order number)
  const filteredOrders = queryValue
    ? orders.filter((order) =>
        order.customerName.toLowerCase().includes(queryValue.toLowerCase()) ||
        order.shopifyOrderNumber.includes(queryValue)
      )
    : orders;

  const rows = filteredOrders.map((order) => [
    <Button key={order.id} variant="plain" onClick={() => navigate(`/orders/${order.id}`)}>
      {`#${order.shopifyOrderNumber}`}
    </Button>,
    order.customerName,
    order.items?.length ?? 0,
    `$${order.totalUsdc.toFixed(2)}`,
    <Badge key={`status-${order.id}`} tone={statusBadgeTone[order.status] || "info"}>
      {ORDER_STATUS_LABELS[order.status] || order.status}
    </Badge>,
    order.escrow ? (
      <Badge
        key={`escrow-${order.id}`}
        tone={
          order.escrow.status === "LOCKED" ? "warning"
          : order.escrow.status === "RELEASED" ? "success"
          : order.escrow.status === "DISPUTED" ? "critical"
          : "info"
        }
      >
        {ESCROW_STATUS_LABELS[order.escrow.status] || order.escrow.status}
      </Badge>
    ) : (
      <Badge key={`escrow-${order.id}`} tone="info">N/A</Badge>
    ),
    new Date(order.createdAt).toLocaleDateString(),
  ]);

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Order Status"
          titleHidden
          choices={Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
            label,
            value,
          }))}
          selected={statusFilter}
          onChange={handleStatusChange}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = statusFilter.length > 0
    ? [{
        key: "status",
        label: `Status: ${statusFilter.map((s) => ORDER_STATUS_LABELS[s as OrderStatus] || s).join(", ")}`,
        onRemove: () => handleStatusChange([]),
      }]
    : [];

  return (
    <Page title="Orders" subtitle="Manage your print-on-demand orders">
      <BlockStack gap="400">
        {error && (
          <Banner title="Error loading orders" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <Filters
              queryValue={queryValue}
              queryPlaceholder="Search by customer or order ID..."
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleQueryChange}
              onQueryClear={handleQueryClear}
              onClearAll={handleFiltersClearAll}
            />
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "text", "text", "text"]}
              headings={["Order", "Customer", "Items", "Total", "Status", "Escrow", "Date"]}
              rows={rows}
              footerContent={
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Showing {filteredOrders.length} of {meta.total} orders — Page {meta.page} of {meta.totalPages}
                  </Text>
                  <InlineStack gap="200">
                    {meta.page > 1 && (
                      <Button
                        size="slim"
                        onClick={() =>
                          setSearchParams((prev) => {
                            prev.set("page", String(meta.page - 1));
                            return prev;
                          })
                        }
                      >
                        Previous
                      </Button>
                    )}
                    {meta.page < meta.totalPages && (
                      <Button
                        size="slim"
                        onClick={() =>
                          setSearchParams((prev) => {
                            prev.set("page", String(meta.page + 1));
                            return prev;
                          })
                        }
                      >
                        Next
                      </Button>
                    )}
                  </InlineStack>
                </InlineStack>
              }
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
