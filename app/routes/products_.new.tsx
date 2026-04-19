import { useState, useCallback, useEffect, useRef } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useFetcher,
  useNavigate,
  useLoaderData,
  useSearchParams,
  Link,
} from "@remix-run/react";
import { apiGet, apiPost , deriveStoreId } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type {
  ProviderProduct,
  Design,
  PricingBreakdown,
  PrintConfig,
  MerchantProduct,
  PaginatedResponse,
} from "~/lib/types";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button, LinkButton } from "~/components/ui/Button";
import { pageMeta } from "~/lib/seo";
import { NumericFormat } from "react-number-format";
import { DesignEditor } from "~/components/editor/DesignEditor";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Create Product",
    description:
      "Launch a new print-on-demand product in minutes. Pick a blank, attach your artwork, set your markup and publish straight to Shopify.",
    path: "/products/new",
    noIndex: true,
  });


export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  return json({ walletAddress });
}

/** Safe number formatter — tolerates `undefined`/`NaN` from late API responses. */
function fmt(n: number | null | undefined, digits = 2): string {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

const STEP_LABELS = [
  "Choose Product",
  "Choose Design",
  "Configure & Price",
  "Review & Publish",
];

export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
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
      x: parseFloat((formData.get("printConfigX") as string) || "0"),
      y: parseFloat((formData.get("printConfigY") as string) || "0"),
      scale: parseFloat((formData.get("printConfigScale") as string) || "1"),
      rotation: parseFloat((formData.get("printConfigRotation") as string) || "0"),
    };

    const mockupDataUrl = formData.get("mockupDataUrl") as string | null;

    const isBurnToClaim = formData.get("isBurnToClaim") === "true";
    const maxSupplyStr = formData.get("maxSupply") as string | null;
    const maxSupply = maxSupplyStr ? parseInt(maxSupplyStr, 10) : null;

    const result = await apiPost<MerchantProduct>(
      `/products/${deriveStoreId(walletAddress)}`,
      {
        designId,
        providerProductId,
        title,
        retailPrice,
        printConfig,
        ...(mockupDataUrl ? { mockupDataUrl } : {}),
        ...(isBurnToClaim ? { isBurnToClaim: true } : {}),
        ...(maxSupply ? { maxSupply } : {}),
      },
      walletAddress,
    );

    if (result.error)
      return json({ error: result.error }, { status: result.status || 500 });

    return json({
      success: true,
      product: result.data,
      intent: "create-draft",
    });
  }

  if (intent === "publish") {
    const productId = formData.get("productId") as string;
    if (!productId)
      return json({ error: "Missing productId" }, { status: 400 });

    const result = await apiPost(
      `/products/${productId}/publish`,
      {},
      walletAddress,
    );
    if (result.error)
      return json({ error: result.error }, { status: result.status || 500 });

    return json({ success: true, intent: "publish" });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function CreateProduct() {
  const navigate = useNavigate();
  const { walletAddress } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const preselectedBlankId = searchParams.get("blank");
  const fetcher = useFetcher<{
    success?: boolean;
    error?: string;
    product?: MerchantProduct;
    intent?: string;
  }>();

  const [step, setStep] = useState(0);
  const [providerProducts, setProviderProducts] = useState<ProviderProduct[]>(
    [],
  );
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<ProviderProduct | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [title, setTitle] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [selectedPrintArea, setSelectedPrintArea] = useState("");
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingDesigns, setLoadingDesigns] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [catalogPage, setCatalogPage] = useState(1);
  const CATALOG_PAGE_SIZE = 9;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [editorLayers, setEditorLayers] = useState<object | null>(null);
  const [editorExportUrl, setEditorExportUrl] = useState<string | null>(null);
  const [editorMockupUrl, setEditorMockupUrl] = useState<string | null>(null);
  const [editorPrintConfig, setEditorPrintConfig] = useState<PrintConfig | null>(null);
  const [targetMargin, setTargetMargin] = useState(30);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      const res = await apiGet<PaginatedResponse<ProviderProduct>>(
        "/provider-products?isActive=true&limit=50",
        walletAddress,
      );
      if (res.error) setLoadError(res.error);
      else
        setProviderProducts(
          res.data?.data ??
            (res.data as unknown as ProviderProduct[]) ??
            [],
        );
      setLoadingCatalog(false);
    }
    loadCatalog();
  }, [walletAddress]);

  useEffect(() => {
    if (step === 1 && designs.length === 0) {
      async function loadDesigns() {
        setLoadingDesigns(true);
        const res = await apiGet<PaginatedResponse<Design>>(
          `/designs/${deriveStoreId(walletAddress)}?limit=50`,
          walletAddress,
        );
        if (res.error) setLoadError(res.error);
        else
          setDesigns(
            res.data?.data ?? (res.data as unknown as Design[]) ?? [],
          );
        setLoadingDesigns(false);
      }
      loadDesigns();
    }
  }, [step, designs.length, walletAddress]);

  useEffect(() => {
    if (selectedProduct) {
      setTitle(selectedProduct.name);
      if (selectedProduct.printAreas.length > 0) {
        setSelectedPrintArea(selectedProduct.printAreas[0].name);
      }
    }
  }, [selectedProduct]);

  // If we arrived via `?blank=<id>` from the providers catalog, auto-select
  // that blank and advance to the next wizard step once the catalog is loaded.
  useEffect(() => {
    if (!preselectedBlankId || selectedProduct) return;
    if (providerProducts.length === 0) return;
    const match = providerProducts.find((p) => p.id === preselectedBlankId);
    if (match) {
      setSelectedProduct(match);
      setStep(1);
    }
  }, [preselectedBlankId, providerProducts, selectedProduct]);

  /** Compute pricing locally for instant feedback (no API call needed) */
  const computeLocalPricing = useCallback(
    (price: number, product: ProviderProduct): PricingBreakdown => {
      const baseCost = product.baseCost;
      const platformFee = price * 0.05;
      const profitMargin = price - baseCost - platformFee;
      const profitPercent = price > 0 ? (profitMargin / price) * 100 : 0;
      return {
        baseCost,
        retailPrice: price,
        platformFee,
        platformFeeRate: 0.05,
        profitMargin,
        profitPercent,
      };
    },
    [],
  );

  const fetchPricing = useCallback(
    (price: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const numPrice = parseFloat(price);
      if (!selectedProduct || isNaN(numPrice) || numPrice <= 0) {
        // Even with no valid price, show baseCost-based breakdown
        if (selectedProduct) {
          setPricing(computeLocalPricing(selectedProduct.baseCost, selectedProduct));
        }
        return;
      }
      // Instantly update with local calculation (no layout shift)
      setPricing(computeLocalPricing(numPrice, selectedProduct));
      setPricingLoading(true);
      debounceRef.current = setTimeout(async () => {
        const res = await apiGet<PricingBreakdown>(
          `/pricing/product/${selectedProduct.id}?retailPrice=${numPrice}`,
          walletAddress,
        );
        if (res.data) {
          setPricing(res.data);
        }
        // If API fails, local calculation is already displayed
        setPricingLoading(false);
      }, 500);
    },
    [selectedProduct, walletAddress, computeLocalPricing],
  );

  const handleRetailPriceChange = useCallback(
    (v: string) => {
      setRetailPrice(v);
      // Enforce minimum price >= baseCost
      if (selectedProduct) {
        const num = parseFloat(v);
        if (!isNaN(num) && num < selectedProduct.baseCost && num > 0) {
          // Don't block typing, just show negative margin in breakdown
        }
      }
      fetchPricing(v);
    },
    [fetchPricing, selectedProduct],
  );

  // Auto-initialize pricing when product is selected
  useEffect(() => {
    if (selectedProduct && !pricing) {
      const initialPrice = selectedProduct.baseCost * 2; // Default 2x markup
      setRetailPrice(initialPrice.toFixed(2));
      setPricing(computeLocalPricing(initialPrice, selectedProduct));
      fetchPricing(initialPrice.toFixed(2));
    }
  }, [selectedProduct, pricing, computeLocalPricing, fetchPricing]);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.intent === "create-draft" && fetcher.data.product) {
      setCreatedProductId(fetcher.data.product.id);
      setStep(3);
    }
    if (fetcher.data?.success && fetcher.data.intent === "publish") {
      navigate("/products");
    }
  }, [fetcher.data, navigate]);

  const isSubmitting = fetcher.state === "submitting";

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/products"
          className="text-on-surface-variant hover:text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Products
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-on-surface-variant">Create Product</span>
      </div>

      <PageHeader
        title="Create Product"
        subtitle="Ship a new item to your Shopify store in 4 steps"
      />

      {/* Stepper */}
      <section className="bg-surface-container-low rounded-2xl p-8">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div
                key={label}
                className="flex items-center gap-4 flex-1 last:flex-none"
              >
                <div
                  className={
                    isDone
                      ? "w-10 h-10 rounded-full bg-green-500/20 text-green-400 border-2 border-green-400 flex items-center justify-center"
                      : isActive
                        ? "w-10 h-10 rounded-full stellar-gradient text-white flex items-center justify-center font-bold"
                        : "w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold"
                  }
                >
                  {isDone ? (
                    <span className="material-symbols-outlined">check</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`hidden md:inline text-sm font-bold ${
                    isActive
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                  }`}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      isDone
                        ? "bg-green-400/40"
                        : "bg-surface-container-highest"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {(fetcher.data?.error || loadError) && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Error</p>
          <p className="text-xs opacity-80">
            {fetcher.data?.error || loadError}
          </p>
        </div>
      )}

      {/* ─── Step 1: Choose Product ─── */}
      {step === 0 && (() => {
        const categories = ["all", ...Array.from(new Set(providerProducts.map((p) => p.productType))).sort()];
        const filtered = categoryFilter === "all"
          ? providerProducts
          : providerProducts.filter((p) => p.productType === categoryFilter);
        const totalPages = Math.ceil(filtered.length / CATALOG_PAGE_SIZE);
        const paginated = filtered.slice(
          (catalogPage - 1) * CATALOG_PAGE_SIZE,
          catalogPage * CATALOG_PAGE_SIZE,
        );

        return (
          <section className="bg-surface-container-low rounded-2xl p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold font-headline">
                Choose a Product from the Catalog
              </h2>
              <span className="text-xs text-on-surface-variant">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const count = cat === "all"
                  ? providerProducts.length
                  : providerProducts.filter((p) => p.productType === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => { setCategoryFilter(cat); setCatalogPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                      categoryFilter === cat
                        ? "bg-[#6366F1] text-white"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.replace("-", " ")} ({count})
                  </button>
                );
              })}
            </div>

            {loadingCatalog ? (
              <p className="text-on-surface-variant text-sm">Loading catalog...</p>
            ) : paginated.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                No products found{categoryFilter !== "all" ? ` in "${categoryFilter}"` : ""}.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {paginated.map((pp) => {
                    const img = Object.values(pp.blankImages)[0];
                    return (
                      <button
                        key={pp.id}
                        onClick={() => {
                          setSelectedProduct(pp);
                          setStep(1);
                        }}
                        className="bg-surface-container p-4 rounded-2xl text-left hover:bg-surface-container-high transition-colors group"
                      >
                        <div className="w-full h-40 rounded-xl bg-surface-container-highest mb-4 flex items-center justify-center overflow-hidden">
                          {img ? (
                            <img
                              src={img}
                              alt={pp.name}
                              className="w-full h-full object-contain p-4"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                              checkroom
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">
                          {pp.name}
                        </h3>
                        {pp.brand && (
                          <p className="text-xs text-on-surface-variant">
                            {pp.brand}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-[10px] font-bold uppercase">
                            {pp.productType}
                          </span>
                          <span className="font-mono font-bold text-sm">
                            ${pp.baseCost.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-2">
                          {pp.productionDays} day
                          {pp.productionDays !== 1 ? "s" : ""} production
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                      disabled={catalogPage === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-bright disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCatalogPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                          catalogPage === page
                            ? "bg-[#6366F1] text-white"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
                      disabled={catalogPage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold bg-surface-container-high text-on-surface-variant hover:bg-surface-bright disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        );
      })()}

      {/* ─── Step 2: Choose Design ─── */}
      {step === 1 && (
        <section className="bg-surface-container-low rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline">
              Choose a Design
            </h2>
            <Button
              variant="secondary"
              className="!py-2"
              onClick={() => setStep(0)}
            >
              Back
            </Button>
          </div>
          {loadingDesigns ? (
            <p className="text-on-surface-variant text-sm">Loading designs...</p>
          ) : designs.length === 0 ? (
            <div className="bg-amber-400/10 border border-amber-400/20 text-amber-200 px-6 py-4 rounded-2xl">
              <p className="text-sm">
                No designs found.{" "}
                <Link
                  to="/designs/upload"
                  className="underline font-bold text-amber-300"
                >
                  Upload a design
                </Link>{" "}
                first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {designs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDesign(d);
                    setStep(2);
                  }}
                  className="bg-surface-container p-3 rounded-2xl text-left hover:bg-surface-container-high transition-colors group"
                >
                  <div className="w-full aspect-square rounded-xl bg-surface-container-highest mb-3 flex items-center justify-center overflow-hidden">
                    {d.thumbnailUrl || d.fileUrl ? (
                      <img
                        src={d.thumbnailUrl || d.fileUrl}
                        alt={d.name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
                        image
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {d.name}
                  </h4>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Step 3: Design Editor + Configure & Price ─── */}
      {step === 2 && selectedProduct && selectedDesign && (
        <div className="space-y-6">
          {/* Design Editor */}
          <DesignEditor
            blankImageUrl={
              Object.values(selectedProduct.blankImages)[0] || ""
            }
            printAreas={
              selectedProduct.printAreas as {
                name: string;
                widthPx: number;
                heightPx: number;
                dpi: number;
              }[]
            }
            designImageUrl={
              selectedDesign.fileUrl || selectedDesign.thumbnailUrl || undefined
            }
            initialLayers={editorLayers}
            apiBaseUrl={
              typeof window !== "undefined"
                ? window.ENV?.PUBLIC_API_URL || ""
                : ""
            }
            onSave={(data) => {
              setEditorLayers(data.layers);
              setEditorExportUrl(data.exportDataUrl);
              setEditorMockupUrl(data.mockupDataUrl);
              setSelectedPrintArea(data.printArea);
              setEditorPrintConfig(data.printConfig);
            }}
            isSaving={isSubmitting}
          />

          {/* Design Resolution Checker */}
          {selectedDesign && selectedProduct && selectedDesign.width && selectedProduct.printAreas.length > 0 && (
            <DesignResolutionChecker
              design={selectedDesign}
              providerProduct={selectedProduct}
            />
          )}

          {/* Product Config + Pricing (below editor) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-surface-container-low rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold font-headline">
                Product Details
              </h2>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Product Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="ghost-input font-headline text-lg"
                  placeholder="My Awesome Product"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Retail Price (USD)
                </label>
                <NumericFormat
                  value={retailPrice}
                  onValueChange={(values) =>
                    handleRetailPriceChange(values.value)
                  }
                  prefix="$ "
                  suffix=" USD"
                  thousandSeparator=","
                  decimalScale={2}
                  fixedDecimalScale
                  allowNegative={false}
                  placeholder="$ 0.00 USD"
                  className="ghost-input font-mono text-lg"
                  inputMode="decimal"
                />
              </div>

              {/* Burn-to-Claim Toggle */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isBurnToClaim"
                    value="true"
                    className="w-4 h-4 rounded border-outline-variant accent-primary"
                  />
                  <div>
                    <span className="text-sm font-bold">Limited Edition — Burn to Claim</span>
                    <p className="text-xs text-on-surface-variant">Buyers get an NFT first, then burn it to receive the physical product</p>
                  </div>
                </label>
              </div>

              {/* Max Supply */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase">Max Supply</label>
                <input
                  type="number"
                  name="maxSupply"
                  min="1"
                  placeholder="e.g. 50"
                  className="w-full mt-1 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/10 text-sm"
                />
                <p className="text-xs text-on-surface-variant mt-1">Leave empty for unlimited</p>
              </div>
            </section>

            {/* Profit Calculator — spans both columns */}
            {selectedProduct && (
              <div className="lg:col-span-2">
                <ProfitCalculator
                  baseCost={selectedProduct.baseCost}
                  targetMargin={targetMargin}
                  onMarginChange={setTargetMargin}
                  onRetailPriceChange={(price) => {
                    handleRetailPriceChange(price);
                  }}
                />
              </div>
            )}

            <section className="bg-surface-container-low rounded-2xl p-6 space-y-4 relative">
              <h2 className="text-lg font-bold font-headline">
                Pricing Breakdown
              </h2>
              {/* Always show pricing data — loading overlay on top */}
              {pricingLoading && (
                <div className="absolute inset-0 bg-surface-container-low/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Updating...
                  </div>
                </div>
              )}
              {pricing ? (
                <div className="space-y-3 text-sm">
                  <PricingRow
                    label="Retail Price"
                    value={`$${fmt(pricing.retailPrice)}`}
                    bold
                  />
                  <PricingRow
                    label="Base Cost"
                    value={`-$${fmt(pricing.baseCost)}`}
                  />
                  <PricingRow
                    label="Platform Fee (5%)"
                    value={`-$${fmt(pricing.platformFee)}`}
                  />
                  <div className="h-[1px] bg-outline-variant/20" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Your Profit</span>
                    <span
                      className={`font-mono font-bold text-lg ${
                        (pricing.profitMargin ?? 0) >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      ${fmt(pricing.profitMargin)}
                      <span className="text-xs ml-1 opacity-70">
                        ({fmt(pricing.profitPercent, 1)}%)
                      </span>
                    </span>
                  </div>
                  {(pricing.profitMargin ?? 0) < 0 && (
                    <p className="text-xs text-red-400/80 mt-1">
                      Price is below cost. Increase retail price above ${fmt(pricing.baseCost / 0.95)}.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm opacity-40">
                  <PricingRow label="Retail Price" value="$—" bold />
                  <PricingRow label="Base Cost" value="-$—" />
                  <PricingRow label="Platform Fee (5%)" value="-$—" />
                  <div className="h-[1px] bg-outline-variant/20" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Your Profit</span>
                    <span className="font-mono font-bold text-lg text-on-surface-variant/40">$—</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 justify-end">
            <Button
              variant="secondary"
              className="!py-2"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
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
              <input
                type="hidden"
                name="printArea"
                value={selectedPrintArea}
              />
              <input
                type="hidden"
                name="printConfigX"
                value={editorPrintConfig?.x ?? 0}
              />
              <input
                type="hidden"
                name="printConfigY"
                value={editorPrintConfig?.y ?? 0}
              />
              <input
                type="hidden"
                name="printConfigScale"
                value={editorPrintConfig?.scale ?? 1}
              />
              <input
                type="hidden"
                name="printConfigRotation"
                value={editorPrintConfig?.rotation ?? 0}
              />
              {editorMockupUrl && (
                <input
                  type="hidden"
                  name="mockupDataUrl"
                  value={editorMockupUrl}
                />
              )}
              <Button
                type="submit"
                disabled={
                  !title ||
                  !retailPrice ||
                  parseFloat(retailPrice) <= 0 ||
                  !editorMockupUrl ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Creating..." : "Create Draft"}
              </Button>
              {!editorMockupUrl && (
                <p className="text-xs text-amber-400 mt-2">
                  Save your design first (click Save in the editor or press Ctrl+S)
                </p>
              )}
            </fetcher.Form>
          </div>
        </div>
      )}

      {/* ─── Step 4: Review & Publish ─── */}
      {step === 3 && selectedProduct && selectedDesign && (
        <section className="bg-surface-container-low rounded-2xl p-8 space-y-8">
          <div className="bg-green-400/10 border border-green-400/20 text-green-300 px-6 py-4 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="text-sm font-bold">
              Product draft created successfully!
            </p>
          </div>

          <h2 className="text-xl font-bold font-headline">Product Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-surface-container-highest flex items-center justify-center overflow-hidden">
                {selectedDesign.thumbnailUrl || selectedDesign.fileUrl ? (
                  <img
                    src={selectedDesign.thumbnailUrl || selectedDesign.fileUrl}
                    alt={selectedDesign.name}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
                    image
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold font-headline">{title}</h3>
                <p className="text-sm text-on-surface-variant">
                  Design: {selectedDesign.name}
                </p>
              </div>
            </div>

            <div className="bg-surface-container p-6 rounded-2xl space-y-3 text-sm">
              <PricingRow
                label="Provider Product"
                value={selectedProduct.name}
              />
              <PricingRow
                label="Type"
                value={selectedProduct.productType}
              />
              <PricingRow
                label="Retail Price"
                value={`$${fmt(parseFloat(retailPrice))}`}
                bold
              />
              <PricingRow
                label="Base Cost"
                value={`$${fmt(selectedProduct.baseCost)}`}
              />
              <PricingRow label="Print Area" value={selectedPrintArea} />
              {pricing && (
                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
                  <span className="font-bold">Estimated Profit</span>
                  <span
                    className={`font-mono font-bold ${
                      (pricing.profitMargin ?? 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    ${fmt(pricing.profitMargin)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <LinkButton to="/products" variant="secondary">
              Save as Draft
            </LinkButton>
            {createdProductId && (
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="publish" />
                <input
                  type="hidden"
                  name="productId"
                  value={createdProductId}
                />
                <Button type="submit" disabled={isSubmitting} icon="rocket_launch">
                  {isSubmitting ? "Publishing..." : "Publish to Shopify"}
                </Button>
              </fetcher.Form>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function PricingRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-on-surface-variant">{label}</span>
      <span
        className={`font-mono ${bold ? "font-bold text-on-surface" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Profit Calculator Widget ─── */

const PLATFORM_FEE_RATE = 0.05;

function ProfitCalculator({
  baseCost,
  targetMargin,
  onMarginChange,
  onRetailPriceChange,
}: {
  baseCost: number;
  targetMargin: number;
  onMarginChange: (margin: number) => void;
  onRetailPriceChange: (price: string) => void;
}) {
  const marginDecimal = targetMargin / 100;
  const divisor = 1 - marginDecimal - PLATFORM_FEE_RATE;
  const calculatedRetail = divisor > 0 ? baseCost / divisor : 0;
  const platformFee = calculatedRetail * PLATFORM_FEE_RATE;
  const profitPerUnit = calculatedRetail - baseCost - platformFee;

  const rev10 = calculatedRetail * 10;
  const rev50 = calculatedRetail * 50;
  const rev100 = calculatedRetail * 100;

  const profit10 = profitPerUnit * 10;
  const profit50 = profitPerUnit * 50;
  const profit100 = profitPerUnit * 100;

  const isViable = divisor > 0;

  return (
    <section className="bg-surface-container-low rounded-2xl p-6 space-y-5 border border-outline-variant/10">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-xl text-[#6366F1]">
          trending_up
        </span>
        <h3 className="text-lg font-bold font-headline">Profit Calculator</h3>
      </div>

      {/* Margin slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Target Margin
          </label>
          <span className="font-mono font-bold text-lg text-[#6366F1]">
            {targetMargin}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={95}
          step={1}
          value={targetMargin}
          onChange={(e) => {
            const m = parseInt(e.target.value, 10);
            onMarginChange(m);
            if (1 - m / 100 - PLATFORM_FEE_RATE > 0) {
              const price = baseCost / (1 - m / 100 - PLATFORM_FEE_RATE);
              onRetailPriceChange(price.toFixed(2));
            }
          }}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            bg-surface-container-highest
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6366F1]
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#6366F1]
            [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-mono">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>95%</span>
        </div>
      </div>

      {!isViable ? (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-xl text-xs">
          Margin + platform fee exceeds 100%. Lower the target margin.
        </div>
      ) : (
        <>
          {/* Computed retail price + profit per unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Suggested Retail
              </p>
              <p className="font-mono font-bold text-xl text-on-surface">
                ${fmt(calculatedRetail)}
              </p>
            </div>
            <div className="bg-surface-container rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Profit / Unit
              </p>
              <p
                className={`font-mono font-bold text-xl ${
                  profitPerUnit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                ${fmt(profitPerUnit)}
              </p>
            </div>
          </div>

          {/* Monthly revenue projections */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Monthly Projections
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { orders: 10, revenue: rev10, profit: profit10 },
                { orders: 50, revenue: rev50, profit: profit50 },
                { orders: 100, revenue: rev100, profit: profit100 },
              ].map(({ orders, revenue, profit }) => (
                <div
                  key={orders}
                  className="bg-surface-container rounded-xl p-3 text-center space-y-1"
                >
                  <p className="text-[10px] text-on-surface-variant font-bold">
                    {orders} orders/mo
                  </p>
                  <p className="font-mono text-xs text-on-surface-variant">
                    ${fmt(revenue, 0)} rev
                  </p>
                  <p
                    className={`font-mono font-bold text-sm ${
                      profit >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${fmt(profit, 0)} profit
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-on-surface-variant/40 text-center">
            Base cost ${fmt(baseCost)} + 5% platform fee. Projections are estimates only.
          </p>
        </>
      )}
    </section>
  );
}

/* ─── Design Resolution Checker Overlay ─── */

function DesignResolutionChecker({
  design,
  providerProduct,
}: {
  design: Design;
  providerProduct: ProviderProduct;
}) {
  const printArea = providerProduct.printAreas[0];
  if (!printArea || !design.width) return null;

  const ratio = design.width / printArea.widthPx;
  const effectiveDpi = Math.round(ratio * printArea.dpi);

  let badgeColor: string;
  let badgeBg: string;
  let badgeBorder: string;
  let label: string;
  let icon: string;

  if (ratio >= 1.0) {
    badgeColor = "text-green-300";
    badgeBg = "bg-green-500/10";
    badgeBorder = "border-green-400/20";
    label = "Excellent quality";
    icon = "check_circle";
  } else if (ratio >= 0.5) {
    badgeColor = "text-amber-300";
    badgeBg = "bg-amber-400/10";
    badgeBorder = "border-amber-400/20";
    label = "Acceptable quality";
    icon = "warning";
  } else {
    badgeColor = "text-red-300";
    badgeBg = "bg-red-500/10";
    badgeBorder = "border-red-400/20";
    label = "Low quality — may look pixelated";
    icon = "error";
  }

  return (
    <div
      className={`${badgeBg} border ${badgeBorder} ${badgeColor} px-4 py-3 rounded-xl flex items-center gap-3`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs opacity-70">
          {design.width}px design / {printArea.widthPx}px print area
          {" = "}
          {effectiveDpi} DPI
          <span className="opacity-50 ml-1">
            (ratio {ratio.toFixed(2)}, print area native {printArea.dpi} DPI)
          </span>
        </p>
      </div>
    </div>
  );
}
