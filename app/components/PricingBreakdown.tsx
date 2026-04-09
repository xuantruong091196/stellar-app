import { Card, BlockStack, InlineStack, Text, Divider } from "@shopify/polaris";

interface PricingBreakdownProps {
  baseCost: number;
  retailPrice: number;
  platformFee: number;
  profitMargin: number;
  profitPercent: number;
}

export function PricingBreakdown({
  baseCost,
  retailPrice,
  platformFee,
  profitMargin,
  profitPercent,
}: PricingBreakdownProps) {
  const isProfit = profitMargin >= 0;
  const profitTone = isProfit ? "success" : "critical";
  const profitSign = isProfit ? "+" : "";

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">Pricing Breakdown</Text>
        <Divider />
        <BlockStack gap="200">
          <InlineStack align="space-between">
            <Text as="span" variant="bodyMd" tone="subdued">Base Cost</Text>
            <Text as="span" variant="bodyMd">${baseCost.toFixed(2)}</Text>
          </InlineStack>
          <InlineStack align="space-between">
            <Text as="span" variant="bodyMd" tone="subdued">Platform Fee</Text>
            <Text as="span" variant="bodyMd">${platformFee.toFixed(2)}</Text>
          </InlineStack>
          <InlineStack align="space-between">
            <Text as="span" variant="bodyMd" tone="subdued">Retail Price</Text>
            <Text as="span" variant="bodyMd" fontWeight="bold">${retailPrice.toFixed(2)}</Text>
          </InlineStack>
        </BlockStack>
        <Divider />
        <InlineStack align="space-between">
          <Text as="span" variant="bodyMd" fontWeight="bold">Profit Margin</Text>
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="bodyMd" fontWeight="bold" tone={profitTone}>
              {profitSign}${profitMargin.toFixed(2)}
            </Text>
            <Text as="span" variant="bodySm" tone={profitTone}>
              ({profitSign}{profitPercent.toFixed(1)}%)
            </Text>
          </InlineStack>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
