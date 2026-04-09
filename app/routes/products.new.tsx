import { useState, useCallback, useEffect, useRef } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Badge,
  InlineGrid,
  Thumbnail,
  ProgressBar,
  Banner,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Divider,
} from "@shopify/polaris";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { apiGet, apiPost } from "~/lib/api";
import type {
  ProviderProduct,
  Design,
  PricingBreakdown,
  PrintConfig,
  MerchantProduct,
  PaginatedResponse,
} from "~/lib/types";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Create Product" }];
};

const STORE_ID = "demo-store";

const STEP_LABELS = [
  "Choose Product",
  "Choose Design",
  "Configure & Price",
  "Review & Publish",
];

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create-draft") {
    const designId = formData.get("designId") as string;
    const providerProductId = formData.get("providerProductId") as string;
    const title = formData.get("title") as string;
    const retailPrice = parseFloat(formData.get("retailPrice") as string);
    const printArea = formData.get("printArea") as string;

    if (!designId || !providerProductId || !title || isNaN(retailPrice)) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    const printConfig: PrintConfig = {
      printArea,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    };

    const result = await apiPost<MerchantProduct>(`/products/${STORE_ID}`, {
      designId,
      providerProductId,
      title,
      retailPrice,
      printConfig,
    });

    if (result.error) {
      return json({ error: result.error }, { status: result.status || 500 });
    }

    return json({ success: true, product: result.data, intent: "create-draft" });
  }

  if (intent === "publish") {
    const productId = formData.get("productId") as string;
    if (!productId) return json({ error: "Missing productId" }, { status: 400 });

    const result = await apiPost(`/products/${productId}/publish`, {});
    if (result.error) {
      return json({ error: result.error }, { status: result.status || 500 });
    }

    return json({ success: true, intent: "publish" });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function CreateProduct() {
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [step, setStep] = useState(0);
  const [providerProducts, setProviderProducts] = useState<ProviderProduct[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProviderProduct | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [title, setTitle] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [selectedPrintArea, setSelectedPrintArea] = useState("");
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      const res = await apiGet<PaginatedResponse<ProviderProduct>>(
        "/provider-products?isActive=true&limit=50",
      );
      if (res.error) {
        setLoadError(res.error);
      } else {
        setProviderProducts(res.data?.data ?? (res.data as unknown as ProviderProduct[]) ?? []);
      }
      setLoadingCatalog(false);
    }
    loadCatalog();
  }, []);

  // Load designs when moving to step 2
  useEffect(() => {
    if (step === 1 && designs.length === 0) {
      async function loadDesigns() {
        setLoadingDesigns(true);
        const res = await apiGet<PaginatedResponse<Design>>(
          `/designs/${STORE_ID}?limit=50`,
        );
        if (res.error) {
          setLoadError(res.error);
        } else {
          setDesigns(res.data?.data ?? (res.data as unknown as Design[]) ?? []);
        }
        setLoadingDesigns(false);
      }
      loadDesigns();
    }
  }, [step, designs.length]);

  // Set defaults when product is selected
  useEffect(() => {
    if (selectedProduct) {
      setTitle(selectedProduct.name);
      if (selectedProduct.printAreas.length > 0) {
        setSelectedPrintArea(selectedProduct.printAreas[0].name);
      }
    }
  }, [selectedProduct]);

  // Debounced pricing fetch
  const fetchPricing = useCallback(
    (price: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const numPrice = parseFloat(price);
      if (!selectedProduct || isNaN(numPrice) || numPrice <= 0) {
        setPricing(null);
        return;
      }

      setPricingLoading(true);
      debounceRef.current = setTimeout(async () => {
        const res = await apiGet<PricingBreakdown>(
          `/pricing/product/${selectedProduct.id}?retailPrice=${numPrice}`,
        );
        if (res.data) {
          setPricing(res.data);
        } else {
          // Compute locally as fallback
          const baseCost = selectedProduct.baseCost;
          const platformFee = numPrice * 0.05;
          const profitMargin = numPrice - baseCost - platformFee;
          const profitPercent = numPrice > 0 ? (profitMargin / numPrice) * 100 : 0;
          setPricing({
            baseCost,
            retailPrice: numPrice,
            platformFee,
            platformFeeRate: 0.05,
            profitMargin,
            profitPercent,
          });
        }
        setPricingLoading(false);
      }, 500);
    },
    [selectedProduct],
  );

  const handleRetailPriceChange = useCallback(
    (value: string) => {
      setRetailPrice(value);
      fetchPricing(value);
    },
    [fetchPricing],
  );

  // Handle fetcher response
  useEffect(() => {
    const data = fetcher.data as {
      success?: boolean;
      error?: string;
      product?: MerchantProduct;
      intent?: string;
    } | undefined;

    if (data?.success && data.intent === "create-draft" && data.product) {
      setCreatedProductId(data.product.id);
      setStep(3);
    }

    if (data?.success && data.intent === "publish") {
      navigate("/products");
    }
  }, [fetcher.data, navigate]);

  const fetcherData = fetcher.data as { error?: string } | undefined;
  const isSubmitting = fetcher.state === "submitting";
  const progressPercent = ((step + 1) / STEP_LABELS.length) * 100;

  return (
    <Page
      title="Create Product"
      backAction={{ content: "Products", onAction: () => navigate("/products") }}
    >
      <BlockStack gap="400">
        {/* Progress indicator */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              {STEP_LABELS.map((label, i) => (
                <Text
                  key={label}
                  as="span"
                  variant="bodySm"
                  fontWeight={i === step ? "bold" : "regular"}
                  tone={i <= step ? undefined : "subdued"}
                >
                  {i + 1}. {label}
                </Text>
              ))}
            </InlineStack>
            <ProgressBar progress={progressPercent} size="small" />
          </BlockStack>
        </Card>

        {fetcherData?.error && (
          <Banner title="Error" tone="critical">
            <p>{fetcherData.error}</p>
          </Banner>
        )}

        {loadError && (
          <Banner title="Error loading data" tone="critical">
            <p>{loadError}</p>
          </Banner>
        )}

        {/* Step 1: Choose Provider Product */}
        {step === 0 && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Choose a Product from the Catalog
                  </Text>
                  {loadingCatalog ? (
                    <Text as="p" tone="subdued">Loading catalog...</Text>
                  ) : providerProducts.length === 0 ? (
                    <Text as="p" tone="subdued">
                      No active products found in the catalog.
                    </Text>
                  ) : (
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                      {providerProducts.map((pp) => (
                        <div
                          key={pp.id}
                          onClick={() => {
                            setSelectedProduct(pp);
                            setStep(1);
                          }}
                          style={{ cursor: "pointer" }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedProduct(pp);
                              setStep(1);
                            }
                          }}
                        >
                          <Card>
                            <BlockStack gap="300">
                              <Box
                                background="bg-surface-secondary"
                                borderRadius="200"
                                padding="400"
                                minHeight="80px"
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
                                <Text as="span" variant="bodySm" fontWeight="bold">
                                  ${pp.baseCost.toFixed(2)}
                                </Text>
                              </InlineStack>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {pp.productionDays} day{pp.productionDays !== 1 ? "s" : ""}{" "}
                                production
                              </Text>
                            </BlockStack>
                          </Card>
                        </div>
                      ))}
                    </InlineGrid>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        {/* Step 2: Choose Design */}
        {step === 1 && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Choose a Design
                    </Text>
                    <Button onClick={() => setStep(0)}>Back</Button>
                  </InlineStack>
                  {loadingDesigns ? (
                    <Text as="p" tone="subdued">Loading designs...</Text>
                  ) : designs.length === 0 ? (
                    <Banner tone="warning">
                      <p>
                        No designs found. Please{" "}
                        <Button variant="plain" onClick={() => navigate("/designs/upload")}>
                          upload a design
                        </Button>{" "}
                        first.
                      </p>
                    </Banner>
                  ) : (
                    <InlineGrid columns={{ xs: 2, sm: 3, md: 4 }} gap="400">
                      {designs.map((design) => (
                        <div
                          key={design.id}
                          onClick={() => {
                            setSelectedDesign(design);
                            setStep(2);
                          }}
                          style={{ cursor: "pointer" }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setSelectedDesign(design);
                              setStep(2);
                            }
                          }}
                        >
                          <Card>
                            <BlockStack gap="200">
                              <Box
                                background="bg-surface-secondary"
                                borderRadius="200"
                                padding="300"
                                minHeight="100px"
                              >
                                <InlineStack align="center">
                                  <Thumbnail
                                    source={
                                      design.thumbnailUrl ||
                                      design.fileUrl ||
                                      "/images/placeholder-design.png"
                                    }
                                    alt={design.name}
                                    size="large"
                                  />
                                </InlineStack>
                              </Box>
                              <Text as="h3" variant="bodySm" truncate>
                                {design.name}
                              </Text>
                            </BlockStack>
                          </Card>
                        </div>
                      ))}
                    </InlineGrid>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}

        {/* Step 3: Configure & Price */}
        {step === 2 && selectedProduct && selectedDesign && (
          <Layout>
            <Layout.Section>
              <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                {/* Left: Selected product + design */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Selected Items
                    </Text>
                    <BlockStack gap="300">
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={
                            Object.values(selectedProduct.blankImages)[0] ||
                            "/images/placeholder-design.png"
                          }
                          alt={selectedProduct.name}
                          size="medium"
                        />
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">
                            {selectedProduct.name}
                          </Text>
                          <Badge>{selectedProduct.productType}</Badge>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Base cost: ${selectedProduct.baseCost.toFixed(2)}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                      <Divider />
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={
                            selectedDesign.thumbnailUrl ||
                            selectedDesign.fileUrl ||
                            "/images/placeholder-design.png"
                          }
                          alt={selectedDesign.name}
                          size="medium"
                        />
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm">
                            {selectedDesign.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Design
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Card>

                {/* Right: Configuration form */}
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Configure Product
                    </Text>
                    <FormLayout>
                      <TextField
                        label="Product Title"
                        value={title}
                        onChange={setTitle}
                        autoComplete="off"
                      />
                      <Select
                        label="Print Area"
                        options={selectedProduct.printAreas.map((pa) => ({
                          label: `${pa.name} (${pa.widthPx}x${pa.heightPx}px @ ${pa.dpi}dpi)`,
                          value: pa.name,
                        }))}
                        value={selectedPrintArea}
                        onChange={setSelectedPrintArea}
                      />
                      <TextField
                        label="Retail Price (USD)"
                        type="number"
                        value={retailPrice}
                        onChange={handleRetailPriceChange}
                        prefix="$"
                        autoComplete="off"
                        min={0}
                        step={0.01}
                      />
                    </FormLayout>

                    {/* Pricing Breakdown */}
                    {pricingLoading && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Calculating pricing...
                      </Text>
                    )}
                    {pricing && !pricingLoading && (
                      <Card>
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            Pricing Breakdown
                          </Text>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodyMd">
                              Retail Price
                            </Text>
                            <Text as="span" variant="bodyMd">
                              ${pricing.retailPrice.toFixed(2)}
                            </Text>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodyMd">
                              Base Cost
                            </Text>
                            <Text as="span" variant="bodyMd">
                              -${pricing.baseCost.toFixed(2)}
                            </Text>
                          </InlineStack>
                          <InlineStack align="space-between">
                            <Text as="span" variant="bodyMd">
                              Platform Fee (5%)
                            </Text>
                            <Text as="span" variant="bodyMd">
                              -${pricing.platformFee.toFixed(2)}
                            </Text>
                          </InlineStack>
                          <Divider />
                          <InlineStack align="space-between">
                            <Text as="span" variant="headingSm">
                              Your Profit
                            </Text>
                            <Text
                              as="span"
                              variant="headingSm"
                              tone={pricing.profitMargin >= 0 ? "success" : "critical"}
                            >
                              ${pricing.profitMargin.toFixed(2)} (
                              {pricing.profitPercent.toFixed(1)}%)
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Card>
                    )}

                    <InlineStack gap="200" align="end">
                      <Button onClick={() => setStep(1)}>Back</Button>
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="create-draft" />
                        <input type="hidden" name="designId" value={selectedDesign.id} />
                        <input
                          type="hidden"
                          name="providerProductId"
                          value={selectedProduct.id}
                        />
                        <input type="hidden" name="title" value={title} />
                        <input type="hidden" name="retailPrice" value={retailPrice} />
                        <input type="hidden" name="printArea" value={selectedPrintArea} />
                        <Button
                          variant="primary"
                          submit
                          disabled={
                            !title ||
                            !retailPrice ||
                            parseFloat(retailPrice) <= 0 ||
                            isSubmitting
                          }
                          loading={isSubmitting}
                        >
                          Create Draft
                        </Button>
                      </fetcher.Form>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </InlineGrid>
            </Layout.Section>
          </Layout>
        )}

        {/* Step 4: Review & Publish */}
        {step === 3 && selectedProduct && selectedDesign && (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Banner tone="success">
                    <p>Product draft created successfully!</p>
                  </Banner>

                  <Text as="h2" variant="headingMd">
                    Product Summary
                  </Text>

                  <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                    <BlockStack gap="300">
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={
                            selectedDesign.thumbnailUrl ||
                            selectedDesign.fileUrl ||
                            "/images/placeholder-design.png"
                          }
                          alt={selectedDesign.name}
                          size="large"
                        />
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingMd">
                            {title}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Design: {selectedDesign.name}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>

                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">
                          Provider Product
                        </Text>
                        <Text as="span" variant="bodyMd">
                          {selectedProduct.name}
                        </Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">
                          Product Type
                        </Text>
                        <Badge>{selectedProduct.productType}</Badge>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">
                          Retail Price
                        </Text>
                        <Text as="span" variant="bodyMd" fontWeight="bold">
                          ${parseFloat(retailPrice).toFixed(2)}
                        </Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">
                          Base Cost
                        </Text>
                        <Text as="span" variant="bodyMd">
                          ${selectedProduct.baseCost.toFixed(2)}
                        </Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">
                          Print Area
                        </Text>
                        <Text as="span" variant="bodyMd">
                          {selectedPrintArea}
                        </Text>
                      </InlineStack>
                      {pricing && (
                        <InlineStack align="space-between">
                          <Text as="span" variant="bodyMd">
                            Estimated Profit
                          </Text>
                          <Text
                            as="span"
                            variant="bodyMd"
                            fontWeight="bold"
                            tone={pricing.profitMargin >= 0 ? "success" : "critical"}
                          >
                            ${pricing.profitMargin.toFixed(2)}
                          </Text>
                        </InlineStack>
                      )}
                    </BlockStack>
                  </InlineGrid>

                  <Divider />

                  <InlineStack gap="200" align="end">
                    <Button onClick={() => navigate("/products")}>
                      Save as Draft
                    </Button>
                    {createdProductId && (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="publish" />
                        <input type="hidden" name="productId" value={createdProductId} />
                        <Button
                          variant="primary"
                          submit
                          loading={isSubmitting}
                          disabled={isSubmitting}
                        >
                          Publish to Shopify
                        </Button>
                      </fetcher.Form>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
