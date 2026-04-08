import { useState, useCallback } from "react";
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
} from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Orders" }];
};

type OrderStatus = "pending" | "in_production" | "shipped" | "delivered" | "disputed";

interface Order {
  id: string;
  shopifyOrderId: string;
  customer: string;
  items: number;
  total: string;
  status: OrderStatus;
  escrowStatus: string;
  date: string;
}

// TODO: Replace with loader data from API
const mockOrders: Order[] = [
  { id: "ORD-1042", shopifyOrderId: "#1042", customer: "John D.", items: 3, total: "$74.97", status: "pending", escrowStatus: "Locked", date: "2026-04-07" },
  { id: "ORD-1041", shopifyOrderId: "#1041", customer: "Sarah M.", items: 1, total: "$24.99", status: "in_production", escrowStatus: "Locked", date: "2026-04-07" },
  { id: "ORD-1040", shopifyOrderId: "#1040", customer: "Mike R.", items: 2, total: "$49.98", status: "shipped", escrowStatus: "Locked", date: "2026-04-06" },
  { id: "ORD-1039", shopifyOrderId: "#1039", customer: "Emily K.", items: 1, total: "$18.50", status: "delivered", escrowStatus: "Released", date: "2026-04-05" },
  { id: "ORD-1038", shopifyOrderId: "#1038", customer: "Tom W.", items: 4, total: "$99.96", status: "disputed", escrowStatus: "Disputed", date: "2026-04-04" },
];

const statusBadgeTone: Record<OrderStatus, "warning" | "info" | "success" | "complete" | "critical"> = {
  pending: "warning",
  in_production: "info",
  shipped: "success",
  delivered: "complete",
  disputed: "critical",
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  in_production: "In Production",
  shipped: "Shipped",
  delivered: "Delivered",
  disputed: "Disputed",
};

export default function Orders() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [queryValue, setQueryValue] = useState("");

  const handleStatusChange = useCallback((value: string[]) => {
    setStatusFilter(value);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQueryValue(value);
  }, []);

  const handleQueryClear = useCallback(() => {
    setQueryValue("");
  }, []);

  const handleFiltersClearAll = useCallback(() => {
    setStatusFilter([]);
    setQueryValue("");
  }, []);

  const filteredOrders = mockOrders.filter((order) => {
    if (statusFilter.length > 0 && !statusFilter.includes(order.status)) {
      return false;
    }
    if (queryValue && !order.customer.toLowerCase().includes(queryValue.toLowerCase()) &&
        !order.shopifyOrderId.includes(queryValue)) {
      return false;
    }
    return true;
  });

  const rows = filteredOrders.map((order) => [
    <Button key={order.id} variant="plain" onClick={() => navigate(`/orders/${order.id}`)}>
      {order.shopifyOrderId}
    </Button>,
    order.customer,
    order.items,
    order.total,
    <Badge key={`status-${order.id}`} tone={statusBadgeTone[order.status]}>
      {statusLabels[order.status]}
    </Badge>,
    <Badge key={`escrow-${order.id}`} tone={order.escrowStatus === "Locked" ? "warning" : order.escrowStatus === "Released" ? "success" : "critical"}>
      {order.escrowStatus}
    </Badge>,
    order.date,
  ]);

  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Order Status"
          titleHidden
          choices={[
            { label: "Pending", value: "pending" },
            { label: "In Production", value: "in_production" },
            { label: "Shipped", value: "shipped" },
            { label: "Delivered", value: "delivered" },
            { label: "Disputed", value: "disputed" },
          ]}
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
        label: `Status: ${statusFilter.map((s) => statusLabels[s as OrderStatus]).join(", ")}`,
        onRemove: () => setStatusFilter([]),
      }]
    : [];

  return (
    <Page title="Orders" subtitle="Manage your print-on-demand orders">
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
              <Text as="span" variant="bodySm" tone="subdued">
                Showing {filteredOrders.length} of {mockOrders.length} orders
              </Text>
            }
          />
        </BlockStack>
      </Card>
    </Page>
  );
}
