import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineGrid,
  Text,
  EmptyState,
} from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { DesignCard } from "~/components/DesignCard";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Designs" }];
};

interface Design {
  id: string;
  name: string;
  thumbnailUrl: string;
  copyrightStatus: "pending" | "registered" | "rejected";
  createdAt: string;
  productCount: number;
}

// TODO: Replace with loader data from API
const mockDesigns: Design[] = [
  {
    id: "DSG-001",
    name: "Galaxy Nebula Pattern",
    thumbnailUrl: "/images/placeholder-design.png",
    copyrightStatus: "registered",
    createdAt: "2026-03-15",
    productCount: 5,
  },
  {
    id: "DSG-002",
    name: "Retro Sunset Wave",
    thumbnailUrl: "/images/placeholder-design.png",
    copyrightStatus: "registered",
    createdAt: "2026-03-20",
    productCount: 3,
  },
  {
    id: "DSG-003",
    name: "Minimalist Logo Mark",
    thumbnailUrl: "/images/placeholder-design.png",
    copyrightStatus: "pending",
    createdAt: "2026-04-01",
    productCount: 0,
  },
  {
    id: "DSG-004",
    name: "Abstract Geometry",
    thumbnailUrl: "/images/placeholder-design.png",
    copyrightStatus: "rejected",
    createdAt: "2026-04-05",
    productCount: 0,
  },
];

export default function Designs() {
  const navigate = useNavigate();

  if (mockDesigns.length === 0) {
    return (
      <Page title="Designs">
        <Card>
          <EmptyState
            heading="Upload your first design"
            action={{
              content: "Upload Design",
              onAction: () => navigate("/designs/upload"),
            }}
            image=""
          >
            <p>Upload designs to start creating print-on-demand products with copyright protection on the Stellar blockchain.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Designs"
      subtitle="Manage your design library"
      primaryAction={{
        content: "Upload Design",
        onAction: () => navigate("/designs/upload"),
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodySm" tone="subdued">
              {mockDesigns.length} designs in your library
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
              {mockDesigns.map((design) => (
                <DesignCard
                  key={design.id}
                  id={design.id}
                  name={design.name}
                  thumbnailUrl={design.thumbnailUrl}
                  copyrightStatus={design.copyrightStatus}
                  productCount={design.productCount}
                />
              ))}
            </InlineGrid>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
