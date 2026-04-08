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
} from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { useParams, useNavigate } from "@remix-run/react";
import { EscrowStatusBadge } from "~/components/EscrowStatusBadge";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Order Detail" }];
};

// TODO: Replace with loader data from API
const mockOrder = {
  id: "ORD-1042",
  shopifyOrderId: "#1042",
  customer: {
    name: "John Doe",
    email: "john@example.com",
    address: "123 Main St, New York, NY 10001",
  },
  items: [
    { name: "Custom T-Shirt - Galaxy Design", quantity: 2, price: "$24.99", sku: "TSH-GAL-M" },
    { name: "Custom Mug - Logo Print", quantity: 1, price: "$14.99", sku: "MUG-LOG-STD" },
  ],
  total: "$64.97",
  status: "in_production" as const,
  escrow: {
    id: "ESC-001",
    status: "locked" as const,
    amount: "$64.97",
    lockedAt: "2026-04-07T10:30:00Z",
    stellarTxHash: "abc123...def456",
  },
  provider: {
    name: "PrintMaster Co.",
    country: "United States",
  },
  shipping: {
    carrier: "USPS",
    trackingNumber: "",
    estimatedDelivery: "2026-04-14",
  },
  createdAt: "2026-04-07",
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showDisputeConfirm, setShowDisputeConfirm] = useState(false);

  const handleRelease = useCallback(() => {
    // TODO: Call API to release escrow funds
    console.log("Releasing escrow for order:", orderId);
    setShowReleaseConfirm(false);
  }, [orderId]);

  const handleDispute = useCallback(() => {
    // TODO: Call API to dispute escrow
    console.log("Disputing escrow for order:", orderId);
    setShowDisputeConfirm(false);
  }, [orderId]);

  const itemRows = mockOrder.items.map((item) => [
    item.name,
    item.sku,
    item.quantity,
    item.price,
  ]);

  return (
    <Page
      title={`Order ${mockOrder.shopifyOrderId}`}
      backAction={{ content: "Orders", onAction: () => navigate("/orders") }}
      subtitle={`Created ${mockOrder.createdAt}`}
    >
      <BlockStack gap="500">
        {showReleaseConfirm && (
          <Banner
            title="Confirm Escrow Release"
            tone="warning"
            onDismiss={() => setShowReleaseConfirm(false)}
          >
            <BlockStack gap="200">
              <Text as="p">
                This will release {mockOrder.escrow.amount} USDC to the print provider.
                This action cannot be undone.
              </Text>
              <InlineStack gap="200">
                <Button variant="primary" onClick={handleRelease}>Confirm Release</Button>
                <Button onClick={() => setShowReleaseConfirm(false)}>Cancel</Button>
              </InlineStack>
            </BlockStack>
          </Banner>
        )}

        {showDisputeConfirm && (
          <Banner
            title="Open Dispute"
            tone="critical"
            onDismiss={() => setShowDisputeConfirm(false)}
          >
            <BlockStack gap="200">
              <Text as="p">
                This will flag the escrow for review. Funds will remain locked until the dispute is resolved.
              </Text>
              <InlineStack gap="200">
                <Button variant="primary" tone="critical" onClick={handleDispute}>Confirm Dispute</Button>
                <Button onClick={() => setShowDisputeConfirm(false)}>Cancel</Button>
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
                  headings={["Product", "SKU", "Qty", "Price"]}
                  rows={itemRows}
                  totals={["", "", "", mockOrder.total]}
                />
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Shipping</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Carrier</Text>
                      <Text as="span" variant="bodyMd">{mockOrder.shipping.carrier}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Tracking</Text>
                      <Text as="span" variant="bodyMd">
                        {mockOrder.shipping.trackingNumber || "Not yet available"}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Est. Delivery</Text>
                      <Text as="span" variant="bodyMd">{mockOrder.shipping.estimatedDelivery}</Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Escrow</Text>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Status</Text>
                    <EscrowStatusBadge status={mockOrder.escrow.status} />
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Amount</Text>
                    <Text as="span" variant="bodyMd" fontWeight="bold">{mockOrder.escrow.amount}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Locked At</Text>
                    <Text as="span" variant="bodySm">{new Date(mockOrder.escrow.lockedAt).toLocaleDateString()}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Tx Hash</Text>
                    <Text as="span" variant="bodySm" tone="subdued">{mockOrder.escrow.stellarTxHash}</Text>
                  </InlineStack>
                </BlockStack>
                <Divider />
                <InlineStack gap="200">
                  <Button variant="primary" onClick={() => setShowReleaseConfirm(true)}>
                    Release Funds
                  </Button>
                  <Button variant="primary" tone="critical" onClick={() => setShowDisputeConfirm(true)}>
                    Dispute
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Customer</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">{mockOrder.customer.name}</Text>
                    <Text as="p" variant="bodySm">{mockOrder.customer.email}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{mockOrder.customer.address}</Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Print Provider</Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">{mockOrder.provider.name}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{mockOrder.provider.country}</Text>
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
