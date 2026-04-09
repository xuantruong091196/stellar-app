import { useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  Tabs,
  BlockStack,
  Text,
  Banner,
  InlineStack,
  EmptyState,
} from "@shopify/polaris";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams, useFetcher } from "@remix-run/react";
import { apiGet, apiPost, apiDelete } from "~/lib/api";
import type { MerchantProduct, MerchantProductStatus, PaginatedResponse } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Products" }];
};

const STORE_ID = "demo-store";

const statusBadgeTone: Record<MerchantProductStatus, "info" | "warning" | "success" | "critical"> = {
  draft: "info",
  publishing: "warning",
  published: "success",
  error: "critical",
};

const statusLabels: Record<MerchantProductStatus, string> = {
  draft: "Draft",
  publishing: "Publishing",
  published: "Published",
  error: "Error",
};

const TAB_MAP: Record<number, string> = {
  0: "",
  1: "draft",
  2: "published",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = url.searchParams.get("page") || "1";

  let endpoint = `/products/store/${STORE_ID}?page=${page}&limit=20`;
  if (status) {
    endpoint += `&status=${status}`;
  }

  const res = await apiGet<PaginatedResponse<MerchantProduct>>(endpoint);

  return json({
    products: res.data?.data ?? [],
    meta: res.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    error: res.error,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "publish") {
    const productId = formData.get("productId") as string;
    if (!productId) return json({ error: "Missing productId" }, { status: 400 });

    const result = await apiPost(`/products/${productId}/publish`, {});
    if (result.error) return json({ error: result.error }, { status: result.status || 500 });
    return json({ success: true });
  }

  if (intent === "unpublish") {
    const productId = formData.get("productId") as string;
    if (!productId) return json({ error: "Missing productId" }, { status: 400 });

    const result = await apiPost(`/products/${productId}/unpublish`, {});
    if (result.error) return json({ error: result.error }, { status: result.status || 500 });
    return json({ success: true });
  }

  if (intent === "delete") {
    const productId = formData.get("productId") as string;
    if (!productId) return json({ error: "Missing productId" }, { status: 400 });

    const result = await apiDelete(`/products/${productId}`);
    if (result.error) return json({ error: result.error }, { status: result.status || 500 });
    return json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function Products() {
  const navigate = useNavigate();
  const { products, meta: pagination, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();

  const currentStatus = searchParams.get("status") || "";
  const selectedTab = currentStatus === "draft" ? 1 : currentStatus === "published" ? 2 : 0;

  const handleTabChange = useCallback(
    (tabIndex: number) => {
      setSearchParams((prev) => {
        const status = TAB_MAP[tabIndex];
        if (status) {
          prev.set("status", status);
        } else {
          prev.delete("status");
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const tabs = [
    { id: "all", content: "All", accessibilityLabel: "All products" },
    { id: "draft", content: "Draft", accessibilityLabel: "Draft products" },
    { id: "published", content: "Published", accessibilityLabel: "Published products" },
  ];

  if (products.length === 0 && !error) {
    return (
      <Page
        title="Products"
        primaryAction={{
          content: "Create Product",
          onAction: () => navigate("/products/new"),
        }}
      >
        <Card>
          <EmptyState
            heading="Create your first product"
            action={{
              content: "Create Product",
              onAction: () => navigate("/products/new"),
            }}
            image=""
          >
            <p>
              Choose a provider product, add your design, set your price, and
              publish to Shopify in minutes.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const rows = products.map((product) => {
    const profit = product.retailPrice - product.baseCost - product.retailPrice * 0.05;
    const profitPercent = product.retailPrice > 0 ? (profit / product.retailPrice) * 100 : 0;

    return [
      <Button
        key={product.id}
        variant="plain"
        onClick={() => navigate(`/products/${product.id}`)}
      >
        {product.title}
      </Button>,
      product.providerProduct?.productType ?? "—",
      `$${product.baseCost.toFixed(2)}`,
      `$${product.retailPrice.toFixed(2)}`,
      <Text
        key={`profit-${product.id}`}
        as="span"
        tone={profit >= 0 ? "success" : "critical"}
      >
        ${profit.toFixed(2)} ({profitPercent.toFixed(0)}%)
      </Text>,
      <Badge key={`status-${product.id}`} tone={statusBadgeTone[product.status]}>
        {statusLabels[product.status] || product.status}
      </Badge>,
      <InlineStack key={`actions-${product.id}`} gap="200">
        {product.status === "draft" && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="publish" />
            <input type="hidden" name="productId" value={product.id} />
            <Button size="slim" submit>
              Publish
            </Button>
          </fetcher.Form>
        )}
        {product.status === "published" && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="unpublish" />
            <input type="hidden" name="productId" value={product.id} />
            <Button size="slim" submit>
              Unpublish
            </Button>
          </fetcher.Form>
        )}
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="productId" value={product.id} />
          <Button size="slim" tone="critical" submit>
            Delete
          </Button>
        </fetcher.Form>
      </InlineStack>,
    ];
  });

  return (
    <Page
      title="Products"
      subtitle="Manage your print-on-demand products"
      primaryAction={{
        content: "Create Product",
        onAction: () => navigate("/products/new"),
      }}
    >
      <BlockStack gap="400">
        {error && (
          <Banner title="Error loading products" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        {(() => {
          const d = fetcher.data as { error?: string } | undefined;
          return d?.error ? (
            <Banner title="Action failed" tone="critical">
              <p>{d.error}</p>
            </Banner>
          ) : null;
        })()}

        <Card padding="0">
          <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
            <div style={{ padding: "16px" }}>
              <DataTable
                columnContentTypes={[
                  "text",
                  "text",
                  "numeric",
                  "numeric",
                  "numeric",
                  "text",
                  "text",
                ]}
                headings={[
                  "Title",
                  "Product Type",
                  "Base Cost",
                  "Retail Price",
                  "Profit",
                  "Status",
                  "Actions",
                ]}
                rows={rows}
                footerContent={
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" tone="subdued">
                      Showing {products.length} of {pagination.total} products — Page{" "}
                      {pagination.page} of {pagination.totalPages}
                    </Text>
                    <InlineStack gap="200">
                      {pagination.page > 1 && (
                        <Button
                          size="slim"
                          onClick={() =>
                            setSearchParams((prev) => {
                              prev.set("page", String(pagination.page - 1));
                              return prev;
                            })
                          }
                        >
                          Previous
                        </Button>
                      )}
                      {pagination.page < pagination.totalPages && (
                        <Button
                          size="slim"
                          onClick={() =>
                            setSearchParams((prev) => {
                              prev.set("page", String(pagination.page + 1));
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
            </div>
          </Tabs>
        </Card>
      </BlockStack>
    </Page>
  );
}
