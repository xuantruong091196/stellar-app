import {
  Page,
  Layout,
  Card,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Thumbnail,
  Divider,
  DataTable,
  Banner,
  Box,
} from "@shopify/polaris";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { apiGet, apiPost, apiDelete } from "~/lib/api";
import type { MerchantProduct, MerchantProductStatus } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Product Detail" }];
};

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

export async function loader({ params }: LoaderFunctionArgs) {
  const { productId } = params;
  if (!productId) {
    return json({ product: null, error: "Missing product ID" });
  }

  const res = await apiGet<MerchantProduct>(`/products/${productId}`);

  return json({
    product: res.data ?? null,
    error: res.error,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const productId = params.productId;

  if (!productId) return json({ error: "Missing product ID" }, { status: 400 });

  if (intent === "publish") {
    const result = await apiPost(`/products/${productId}/publish`, {});
    if (result.error) return json({ error: result.error }, { status: result.status || 500 });
    return json({ success: true });
  }

  if (intent === "unpublish") {
    const result = await apiPost(`/products/${productId}/unpublish`, {});
    if (result.error) return json({ error: result.error }, { status: result.status || 500 });
    return json({ success: true });
  }

  if (intent === "delete") {
    const result = await apiDelete(`/products/${productId}`);
    if (result.error) return json({ error: result.error }, { status: result.status || 500 });
    return json({ success: true, deleted: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function ProductDetail() {
  const navigate = useNavigate();
  const { product, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const fetcherData = fetcher.data as { error?: string; deleted?: boolean } | undefined;
  const isSubmitting = fetcher.state === "submitting";

  if (fetcherData?.deleted) {
    navigate("/products");
    return null;
  }

  if (error || !product) {
    return (
      <Page
        title="Product Not Found"
        backAction={{ content: "Products", onAction: () => navigate("/products") }}
      >
        <Banner title="Error" tone="critical">
          <p>{error || "Product not found"}</p>
        </Banner>
      </Page>
    );
  }

  const profit = product.retailPrice - product.baseCost - product.retailPrice * 0.05;
  const profitPercent = product.retailPrice > 0 ? (profit / product.retailPrice) * 100 : 0;
  const platformFee = product.retailPrice * 0.05;

  const variantRows = (product.providerProduct?.variants ?? []).map((v) => [
    v.size,
    v.color,
    v.sku,
    `$${v.additionalCost.toFixed(2)}`,
    v.inStock ? (
      <Badge key={v.id} tone="success">In Stock</Badge>
    ) : (
      <Badge key={v.id} tone="critical">Out of Stock</Badge>
    ),
  ]);

  return (
    <Page
      title={product.title}
      backAction={{ content: "Products", onAction: () => navigate("/products") }}
      titleMetadata={
        <Badge tone={statusBadgeTone[product.status]}>
          {statusLabels[product.status] || product.status}
        </Badge>
      }
      secondaryActions={[
        ...(product.status === "draft"
          ? [{ content: "Publish", onAction: () => {} }]
          : []),
        ...(product.status === "published"
          ? [{ content: "Unpublish", onAction: () => {} }]
          : []),
      ]}
    >
      <BlockStack gap="400">
        {fetcherData?.error && (
          <Banner title="Action failed" tone="critical">
            <p>{fetcherData.error}</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            {/* Product Info */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Product Details</Text>
                <InlineStack gap="400" blockAlign="start">
                  {/* Design thumbnail */}
                  <Box minWidth="120px">
                    <Thumbnail
                      source={
                        product.design?.thumbnailUrl ||
                        product.design?.fileUrl ||
                        "/images/placeholder-design.png"
                      }
                      alt={product.design?.name || "Design"}
                      size="large"
                    />
                  </Box>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingLg">{product.title}</Text>
                    {product.description && (
                      <Text as="p" variant="bodyMd">{product.description}</Text>
                    )}
                    <InlineStack gap="200">
                      <Badge>{product.providerProduct?.productType ?? "—"}</Badge>
                      <Badge tone={statusBadgeTone[product.status]}>
                        {statusLabels[product.status]}
                      </Badge>
                    </InlineStack>
                    {product.shopifyProductId && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Shopify Product ID: {product.shopifyProductId}
                      </Text>
                    )}
                    {product.publishedAt && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Published: {new Date(product.publishedAt).toLocaleString()}
                      </Text>
                    )}
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Provider Product Info */}
            {product.providerProduct && (
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Provider Product</Text>
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail
                        source={
                          Object.values(product.providerProduct.blankImages)[0] ||
                          "/images/placeholder-design.png"
                        }
                        alt={product.providerProduct.name}
                        size="medium"
                      />
                      <BlockStack gap="100">
                        <Text as="h3" variant="headingSm">
                          {product.providerProduct.name}
                        </Text>
                        {product.providerProduct.brand && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            Brand: {product.providerProduct.brand}
                          </Text>
                        )}
                        <Text as="p" variant="bodySm" tone="subdued">
                          Production: {product.providerProduct.productionDays} day
                          {product.providerProduct.productionDays !== 1 ? "s" : ""}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </Box>
            )}

            {/* Variants */}
            {variantRows.length > 0 && (
              <Box paddingBlockStart="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">Variants</Text>
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "text"]}
                      headings={["Size", "Color", "SKU", "Additional Cost", "Stock"]}
                      rows={variantRows}
                    />
                  </BlockStack>
                </Card>
              </Box>
            )}
          </Layout.Section>

          <Layout.Section variant="oneThird">
            {/* Pricing Breakdown */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Pricing Breakdown</Text>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">Retail Price</Text>
                  <Text as="span" variant="bodyMd" fontWeight="bold">
                    ${product.retailPrice.toFixed(2)}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">Base Cost</Text>
                  <Text as="span" variant="bodyMd">
                    -${product.baseCost.toFixed(2)}
                  </Text>
                </InlineStack>
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">Platform Fee (5%)</Text>
                  <Text as="span" variant="bodyMd">
                    -${platformFee.toFixed(2)}
                  </Text>
                </InlineStack>
                <Divider />
                <InlineStack align="space-between">
                  <Text as="span" variant="headingSm">Your Profit</Text>
                  <Text
                    as="span"
                    variant="headingSm"
                    tone={profit >= 0 ? "success" : "critical"}
                  >
                    ${profit.toFixed(2)} ({profitPercent.toFixed(1)}%)
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Print Config */}
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">Print Configuration</Text>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Print Area</Text>
                    <Text as="span" variant="bodyMd">{product.printConfig.printArea}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Scale</Text>
                    <Text as="span" variant="bodyMd">{product.printConfig.scale}x</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">Rotation</Text>
                    <Text as="span" variant="bodyMd">{product.printConfig.rotation}deg</Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Box>

            {/* Actions */}
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Actions</Text>
                  {product.status === "draft" && (
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="publish" />
                      <Button variant="primary" submit fullWidth loading={isSubmitting}>
                        Publish to Shopify
                      </Button>
                    </fetcher.Form>
                  )}
                  {product.status === "published" && (
                    <>
                      {product.shopifyProductId && (
                        <Button
                          fullWidth
                          url={`https://admin.shopify.com/products/${product.shopifyProductId}`}
                          target="_blank"
                        >
                          View on Shopify
                        </Button>
                      )}
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="unpublish" />
                        <Button submit fullWidth loading={isSubmitting}>
                          Unpublish
                        </Button>
                      </fetcher.Form>
                    </>
                  )}
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <Button tone="critical" submit fullWidth loading={isSubmitting}>
                      Delete Product
                    </Button>
                  </fetcher.Form>
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
