import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  EmptyState,
  Banner,
} from "@shopify/polaris";
import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { DesignCard } from "~/components/DesignCard";
import { apiGet, apiDelete } from "~/lib/api";
import type { Design, PaginatedResponse } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Designs" }];
};

const STORE_ID = "demo-store";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";

  const result = await apiGet<PaginatedResponse<Design>>(
    `/designs/${STORE_ID}?page=${page}&limit=20`,
  );

  if (result.error) {
    return json({ designs: [] as Design[], meta: null, error: result.error });
  }

  return json({
    designs: result.data?.data ?? [],
    meta: result.data?.meta ?? null,
    error: null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const designId = formData.get("designId") as string;
    if (!designId) {
      return json({ error: "Missing designId" }, { status: 400 });
    }

    const result = await apiDelete(`/designs/${designId}`);
    if (result.error) {
      return json({ error: result.error }, { status: result.status || 500 });
    }

    return json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

function deriveCopyrightStatus(design: Design): "pending" | "registered" | "rejected" {
  if (design.copyrightTxHash) return "registered";
  if (design.copyrightAt) return "pending";
  return "pending";
}

export default function Designs() {
  const navigate = useNavigate();
  const { designs, meta: pagination, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  if (error) {
    return (
      <Page title="Designs">
        <Banner title="Error loading designs" tone="critical">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  if (designs.length === 0) {
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
            {(() => {
              const d = fetcher.data as { error?: string } | undefined;
              return d?.error ? (
                <Banner title="Action failed" tone="critical">
                  <p>{d.error}</p>
                </Banner>
              ) : null;
            })()}
            <Text as="p" variant="bodySm" tone="subdued">
              {pagination ? `${pagination.total} designs in your library` : `${designs.length} designs in your library`}
            </Text>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
              {designs.map((design) => (
                <DesignCard
                  key={design.id}
                  id={design.id}
                  name={design.name}
                  thumbnailUrl={design.thumbnailUrl || design.fileUrl || "/images/placeholder-design.png"}
                  copyrightStatus={deriveCopyrightStatus(design)}
                  productCount={design.mockups?.length ?? 0}
                />
              ))}
            </InlineGrid>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
