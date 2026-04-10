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
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    };

    const result = await apiPost<MerchantProduct>(
      `/products/${deriveStoreId(walletAddress)}`,
      {
        designId,
        providerProductId,
        title,
        retailPrice,
        printConfig,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [editorLayers, setEditorLayers] = useState<object | null>(null);
  const [editorExportUrl, setEditorExportUrl] = useState<string | null>(null);

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
          walletAddress,
        );
        if (res.data) {
          setPricing(res.data);
        } else {
          const baseCost = selectedProduct.baseCost;
          const platformFee = numPrice * 0.05;
          const profitMargin = numPrice - baseCost - platformFee;
          const profitPercent =
            numPrice > 0 ? (profitMargin / numPrice) * 100 : 0;
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
    [selectedProduct, walletAddress],
  );

  const handleRetailPriceChange = useCallback(
    (v: string) => {
      setRetailPrice(v);
      fetchPricing(v);
    },
    [fetchPricing],
  );

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
      {step === 0 && (
        <section className="bg-surface-container-low rounded-2xl p-8 space-y-6">
          <h2 className="text-xl font-bold font-headline">
            Choose a Product from the Catalog
          </h2>
          {loadingCatalog ? (
            <p className="text-on-surface-variant text-sm">Loading catalog...</p>
          ) : providerProducts.length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              No active products found in the catalog.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {providerProducts.map((pp) => {
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
          )}
        </section>
      )}

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
              setSelectedPrintArea(data.printArea);
            }}
            isSaving={isSubmitting}
          />

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
                <div className="relative">
                  <span className="absolute left-0 top-3 text-on-surface-variant font-mono">
                    $
                  </span>
                  <NumericFormat
                    value={retailPrice}
                    onValueChange={(values) =>
                      handleRetailPriceChange(values.value)
                    }
                    thousandSeparator=","
                    decimalScale={2}
                    allowNegative={false}
                    placeholder="29.99"
                    className="ghost-input pl-6 font-mono text-lg"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold font-headline">
                Pricing Breakdown
              </h2>
              {pricingLoading && (
                <p className="text-on-surface-variant text-sm">
                  Calculating...
                </p>
              )}
              {!pricing && !pricingLoading && (
                <div className="text-center py-6 space-y-2">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
                    calculate
                  </span>
                  <p className="text-xs text-on-surface-variant/60">
                    Enter a retail price to see your profit breakdown
                  </p>
                  {selectedProduct && (
                    <p className="text-[10px] text-on-surface-variant/40">
                      Base cost: ${fmt(selectedProduct.baseCost)} + 5% platform fee
                    </p>
                  )}
                </div>
              )}
              {pricing && !pricingLoading && (
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
                name="printConfig"
                value={JSON.stringify({
                  printArea: selectedPrintArea,
                  layers: editorLayers,
                  exportUrl: editorExportUrl,
                })}
              />
              <Button
                type="submit"
                disabled={
                  !title ||
                  !retailPrice ||
                  parseFloat(retailPrice) <= 0 ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Creating..." : "Create Draft"}
              </Button>
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
