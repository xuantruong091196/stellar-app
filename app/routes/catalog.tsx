import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Badge,
  Select,
  InlineGrid,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Button,
  Thumbnail,
  Box,
  Modal,
  DataTable,
  Divider,
} from "@shopify/polaris";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import type { ProviderProduct, PaginatedResponse } from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Product Catalog" }];
};

const PRODUCT_TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "T-Shirt", value: "T-Shirt" },
  { label: "Hoodie", value: "Hoodie" },
  { label: "Mug", value: "Mug" },
  { label: "Poster", value: "Poster" },
  { label: "Tote Bag", value: "Tote Bag" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const productType = url.searchParams.get("productType") || "";
  const page = url.searchParams.get("page") || "1";

  let endpoint = `/provider-products?page=${page}&limit=20`;
  if (productType) {
    endpoint += `&productType=${encodeURIComponent(productType)}`;
  }

  const res = await apiGet<PaginatedResponse<ProviderProduct>>(endpoint);

  return json({
    products: res.data?.data ?? (res.data as unknown as ProviderProduct[]) ?? [],
    meta: res.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    error: res.error,
  });
}

export default function Catalog() {
  const navigate = useNavigate();
  const { products, meta: pagination, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState<ProviderProduct | null>(null);

  const currentType = searchParams.get("productType") || "";

  const handleTypeChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value) {
          prev.set("productType", value);
        } else {
          prev.delete("productType");
        }
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const uniqueSizes = selectedProduct?.variants
    ? [...new Set(selectedProduct.variants.map((v) => v.size))]
    : [];

  const uniqueColors = selectedProduct?.variants
    ? [...new Set(selectedProduct.variants.map((v) => v.color))]
    : [];

  const sizeChartRows = selectedProduct?.sizeChart
    ? Object.entries(selectedProduct.sizeChart).map(([size, measurements]) => [
        size,
        ...Object.values(measurements).map((v) => `${v}`),
      ])
    : [];

  const sizeChartHeadings = selectedProduct?.sizeChart
    ? [
        "Size",
        ...Object.keys(Object.values(selectedProduct.sizeChart)[0] || {}),
      ]
    : [];

  return (
    <Page title="Product Catalog" subtitle="Browse available products from providers">
      <BlockStack gap="400">
        {error && (
          <Banner title="Error loading catalog" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        <Card>
          <InlineStack gap="400" blockAlign="center">
            <div style={{ minWidth: "200px" }}>
              <Select
                label="Product Type"
                labelInline
                options={PRODUCT_TYPE_OPTIONS}
                value={currentType}
                onChange={handleTypeChange}
              />
            </div>
            <Text as="span" variant="bodySm" tone="subdued">
              {pagination.total} product{pagination.total !== 1 ? "s" : ""} found
            </Text>
          </InlineStack>
        </Card>

        {products.length === 0 ? (
          <Card>
            <Text as="p" tone="subdued">
              No products found for the selected filter.
            </Text>
          </Card>
        ) : (
          <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="400">
            {products.map((pp) => {
              const variantSizes = pp.variants
                ? [...new Set(pp.variants.map((v) => v.size))]
                : [];
              const variantColors = pp.variants
                ? [...new Set(pp.variants.map((v) => v.color))]
                : [];

              return (
                <div
                  key={pp.id}
                  onClick={() => setSelectedProduct(pp)}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedProduct(pp);
                    }
                  }}
                >
                  <Card>
                    <BlockStack gap="300">
                      <Box
                        background="bg-surface-secondary"
                        borderRadius="200"
                        padding="400"
                        minHeight="100px"
                      >
                        <InlineStack align="center">
                          <Thumbnail
                            source={
                              Object.values(pp.blankImages)[0] ||
                              "/images/placeholder-design.png"
                            }
                            alt={pp.name}
                            size="large"
                          />
                        </InlineStack>
                      </Box>
                      <Text as="h3" variant="headingSm" truncate>
                        {pp.name}
                      </Text>
                      {pp.brand && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          {pp.brand}
                        </Text>
                      )}
                      <InlineStack gap="200" blockAlign="center">
                        <Badge>{pp.productType}</Badge>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          ${pp.baseCost.toFixed(2)}
                        </Text>
                      </InlineStack>
                      {variantSizes.length > 0 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          Sizes: {variantSizes.join(", ")}
                        </Text>
                      )}
                      {variantColors.length > 0 && (
                        <Text as="p" variant="bodySm" tone="subdued">
                          Colors: {variantColors.length} available
                        </Text>
                      )}
                      <Text as="p" variant="bodySm" tone="subdued">
                        {pp.productionDays} day{pp.productionDays !== 1 ? "s" : ""} production
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
              );
            })}
          </InlineGrid>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Card>
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm" tone="subdued">
                Page {pagination.page} of {pagination.totalPages}
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
          </Card>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <Modal
            open={!!selectedProduct}
            onClose={() => setSelectedProduct(null)}
            title={selectedProduct.name}
            primaryAction={{
              content: "Create Product with This",
              onAction: () => navigate("/products/new"),
            }}
            secondaryActions={[
              { content: "Close", onAction: () => setSelectedProduct(null) },
            ]}
            size="large"
          >
            <Modal.Section>
              <BlockStack gap="400">
                <InlineStack gap="400" blockAlign="start">
                  <Thumbnail
                    source={
                      Object.values(selectedProduct.blankImages)[0] ||
                      "/images/placeholder-design.png"
                    }
                    alt={selectedProduct.name}
                    size="large"
                  />
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">{selectedProduct.name}</Text>
                    {selectedProduct.brand && (
                      <Text as="p" variant="bodyMd">Brand: {selectedProduct.brand}</Text>
                    )}
                    <InlineStack gap="200">
                      <Badge>{selectedProduct.productType}</Badge>
                      <Text as="span" variant="bodyMd" fontWeight="bold">
                        ${selectedProduct.baseCost.toFixed(2)}
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Production: {selectedProduct.productionDays} day
                      {selectedProduct.productionDays !== 1 ? "s" : ""}
                    </Text>
                    {selectedProduct.weightGrams && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Weight: {selectedProduct.weightGrams}g
                      </Text>
                    )}
                    {selectedProduct.description && (
                      <Text as="p" variant="bodyMd">{selectedProduct.description}</Text>
                    )}
                  </BlockStack>
                </InlineStack>

                {/* Print Areas */}
                {selectedProduct.printAreas.length > 0 && (
                  <>
                    <Divider />
                    <Text as="h3" variant="headingSm">Print Areas</Text>
                    {selectedProduct.printAreas.map((pa) => (
                      <InlineStack key={pa.name} gap="200">
                        <Badge>{pa.name}</Badge>
                        <Text as="span" variant="bodySm">
                          {pa.widthPx} x {pa.heightPx}px @ {pa.dpi}dpi
                        </Text>
                      </InlineStack>
                    ))}
                  </>
                )}

                {/* Available Sizes & Colors */}
                {(uniqueSizes.length > 0 || uniqueColors.length > 0) && (
                  <>
                    <Divider />
                    <Text as="h3" variant="headingSm">Available Options</Text>
                    {uniqueSizes.length > 0 && (
                      <InlineStack gap="100" wrap>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          Sizes:
                        </Text>
                        {uniqueSizes.map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </InlineStack>
                    )}
                    {uniqueColors.length > 0 && (
                      <InlineStack gap="100" wrap>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          Colors:
                        </Text>
                        {uniqueColors.map((c) => (
                          <Badge key={c}>{c}</Badge>
                        ))}
                      </InlineStack>
                    )}
                  </>
                )}

                {/* Size Chart */}
                {sizeChartRows.length > 0 && (
                  <>
                    <Divider />
                    <Text as="h3" variant="headingSm">Size Chart</Text>
                    <DataTable
                      columnContentTypes={sizeChartHeadings.map(() => "text" as const)}
                      headings={sizeChartHeadings}
                      rows={sizeChartRows}
                    />
                  </>
                )}

                {/* All Variants */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <>
                    <Divider />
                    <Text as="h3" variant="headingSm">
                      All Variants ({selectedProduct.variants.length})
                    </Text>
                    <DataTable
                      columnContentTypes={["text", "text", "text", "numeric", "text"]}
                      headings={["Size", "Color", "SKU", "Extra Cost", "Stock"]}
                      rows={selectedProduct.variants.map((v) => [
                        v.size,
                        v.color,
                        v.sku,
                        v.additionalCost > 0 ? `+$${v.additionalCost.toFixed(2)}` : "$0.00",
                        v.inStock ? "In Stock" : "Out of Stock",
                      ])}
                    />
                  </>
                )}
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Page>
  );
}
