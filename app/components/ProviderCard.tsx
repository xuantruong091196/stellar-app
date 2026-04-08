import { Card, Badge, Button, BlockStack, InlineStack, Text } from "@shopify/polaris";

interface ProviderCardProps {
  id: string;
  name: string;
  country: string;
  rating: number;
  specialties: string[];
  productsAvailable: number;
  connected: boolean;
  onConnect: (providerId: string) => void;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const stars = [];

  for (let i = 0; i < fullStars; i++) {
    stars.push("\u2605");
  }
  if (hasHalf) {
    stars.push("\u00BD");
  }

  return (
    <InlineStack gap="100" blockAlign="center">
      <Text as="span" variant="bodyMd" tone="caution">
        {stars.join("")}
      </Text>
      <Text as="span" variant="bodySm" tone="subdued">
        {rating.toFixed(1)}
      </Text>
    </InlineStack>
  );
}

export function ProviderCard({
  id,
  name,
  country,
  rating,
  specialties,
  productsAvailable,
  connected,
  onConnect,
}: ProviderCardProps) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="start">
          <BlockStack gap="100">
            <Text as="h3" variant="headingSm">{name}</Text>
            <Text as="p" variant="bodySm" tone="subdued">{country}</Text>
          </BlockStack>
          {connected && <Badge tone="success">Connected</Badge>}
        </InlineStack>

        <StarRating rating={rating} />

        <InlineStack gap="100" wrap>
          {specialties.map((specialty) => (
            <Badge key={specialty}>{specialty}</Badge>
          ))}
        </InlineStack>

        <Text as="p" variant="bodySm" tone="subdued">
          {productsAvailable} products available
        </Text>

        <Button
          variant={connected ? "secondary" : "primary"}
          onClick={() => onConnect(id)}
          fullWidth
        >
          {connected ? "Disconnect" : "Connect"}
        </Button>
      </BlockStack>
    </Card>
  );
}
