import { Card, Badge, BlockStack, InlineStack, Text, Box, Thumbnail } from "@shopify/polaris";

type CopyrightStatus = "pending" | "registered" | "rejected";

interface DesignCardProps {
  id: string;
  name: string;
  thumbnailUrl: string;
  copyrightStatus: CopyrightStatus;
  productCount: number;
}

const copyrightConfig: Record<CopyrightStatus, { label: string; tone: "info" | "success" | "critical" }> = {
  pending: { label: "Pending", tone: "info" },
  registered: { label: "Registered", tone: "success" },
  rejected: { label: "Rejected", tone: "critical" },
};

export function DesignCard({ name, thumbnailUrl, copyrightStatus, productCount }: DesignCardProps) {
  const copyright = copyrightConfig[copyrightStatus];

  return (
    <Card>
      <BlockStack gap="300">
        <Box
          background="bg-surface-secondary"
          borderRadius="200"
          padding="400"
          minHeight="120px"
        >
          <InlineStack align="center">
            <Thumbnail source={thumbnailUrl} alt={name} size="large" />
          </InlineStack>
        </Box>

        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" truncate>
            {name}
          </Text>

          <InlineStack gap="200" blockAlign="center">
            <Badge tone={copyright.tone}>{copyright.label}</Badge>
            <Text as="span" variant="bodySm" tone="subdued">
              {productCount} {productCount === 1 ? "product" : "products"}
            </Text>
          </InlineStack>
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
