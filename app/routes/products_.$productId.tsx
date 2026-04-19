import { useState, useMemo } from "react";
import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";

import { apiGet, apiPost, apiDelete } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type { MerchantProduct } from "~/lib/types";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { useConfirm } from "~/components/ui/ConfirmModal";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Product Detail",
    description:
      "Inspect and manage an individual print-on-demand product — pricing, variants, artwork and publish status.",
    noIndex: true,
  });

export async function loader({ request, params }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const { productId } = params;
  if (!productId)
    return json({ product: null, error: "Missing product ID" });

  const res = await apiGet<MerchantProduct>(
    `/products/${productId}`,
    walletAddress,
  );
  return json({ product: res.data ?? null, error: res.error });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const productId = params.productId;
  if (!productId)
    return json({ error: "Missing product ID" }, { status: 400 });

  if (intent === "publish") {
    const r = await apiPost(`/products/${productId}/publish`, {}, walletAddress);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "unpublish") {
    const r = await apiPost(`/products/${productId}/unpublish`, {}, walletAddress);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "delete") {
    const r = await apiDelete(`/products/${productId}`, walletAddress);
    if (r.error) return json({ error: r.error }, { status: r.status || 500 });
    return redirect("/products");
  }
  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function ProductDetail() {
  const { product, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ error?: string }>();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<number>(0);

  const isSubmitting = fetcher.state === "submitting";
  const { confirm: confirmDialog } = useConfirm();

  // All hooks must run before any conditional returns
  const providerProduct = product?.providerProduct;

  const colors = useMemo(() => {
    if (!providerProduct) return [];
    return [
      ...new Set(providerProduct.variants?.map((v) => v.color) || []),
    ];
  }, [providerProduct]);

  const sizes = useMemo(() => {
    if (!providerProduct) return [];
    return [
      ...new Set(providerProduct.variants?.map((v) => v.size) || []),
    ];
  }, [providerProduct]);

  const colorHexMap = useMemo(() => {
    const map: Record<string, string> = {};
    providerProduct?.variants?.forEach((v) => {
      if (v.color && v.colorHex) map[v.color] = v.colorHex;
    });
    return map;
  }, [providerProduct]);

  const images = useMemo(() => {
    if (!product) return [];

    const productType = providerProduct?.productType;
    const mockups = product.design?.mockups || [];

    // Only show mockups that match THIS product's providerProduct type.
    // A design can be used across multiple products (t-shirt, mug, hoodie)
    // so we must not mix mockups from different product types.
    const mine = mockups.filter((m) => m.productType === productType);
    if (mine.length > 0) {
      const editorFirst = [
        ...mine.filter((m) => m.variant === "editor-export"),
        ...mine.filter((m) => m.variant !== "editor-export"),
      ];
      return editorFirst.map((m) => ({
        url: m.imageUrl,
        label: m.variant === "editor-export" ? "Preview" : m.variant,
      }));
    }

    // Fallback: blank product images
    const blankImages = providerProduct?.blankImages || {};
    return Object.entries(blankImages).map(([color, url]) => ({
      url: url as string,
      label: color,
    }));
  }, [product, providerProduct]);

  const isMockupPending = useMemo(() => {
    if (!product?.design?.mockups) return false;
    const productType = providerProduct?.productType;
    if (!productType) return false;
    return !product.design.mockups.some((m) => m.productType === productType);
  }, [product, providerProduct]);

  if (error || !product) {
    return (
      <AnimatedPage>
        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/products"
            className="text-on-surface-variant hover:text-primary flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Products
          </Link>
        </div>
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl mt-4">
          <p className="text-sm">{error || "Product not found"}</p>
        </div>
      </AnimatedPage>
    );
  }

  const platformFeeRate = 0.05;
  const platformFee = product.retailPrice * platformFeeRate;
  const stellarTxFee = 0.02;
  const escrowHolding = product.retailPrice * 0.02;
  const totalUnitCost = product.baseCost + stellarTxFee + escrowHolding;
  const profit = product.retailPrice - product.baseCost - platformFee;
  const profitPercent =
    product.retailPrice > 0 ? (profit / product.retailPrice) * 100 : 0;

  const mainImage = images[activeImage]?.url;
  const provider = providerProduct?.provider;
  const shopifyStorefrontUrl =
    product.store && product.shopifyProductId
      ? `https://${product.store.shopifyDomain}/admin/products/${product.shopifyProductId}`
      : null;

  const sales = product.salesPerformance;
  const maxBucket = sales ? Math.max(...sales.dailyBuckets, 1) : 1;

  const specs = product.technicalSpecs || [];
  const rules = product.smartContractRules || [];

  return (
    <AnimatedPage>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/products"
          className="text-on-surface-variant hover:text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Products
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-on-surface-variant">{product.title}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tighter text-on-surface">
            {product.title}
          </h1>
          <div className="flex items-center gap-3 text-on-surface-variant font-mono text-sm">
            <span className="bg-surface-container-high px-2 py-0.5 rounded">
              ID: {product.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span>
              Updated: {new Date(product.updatedAt).toLocaleDateString()}
            </span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <StatusBadge status={product.status} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {product.status === "draft" && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="publish" />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 rounded-full text-on-primary stellar-gradient font-bold text-sm shadow-xl shadow-primary/10 transition-all hover:opacity-90 active:scale-95 duration-200 flex items-center gap-2 disabled:opacity-50"
              >
                <span>
                  {isSubmitting ? "Publishing..." : "Publish to Shopify"}
                </span>
                <span className="material-symbols-outlined text-sm">
                  rocket_launch
                </span>
              </button>
            </fetcher.Form>
          )}
          {product.status === "published" && shopifyStorefrontUrl && (
            <a
              href={shopifyStorefrontUrl}
              target="_blank"
              rel="noreferrer"
              className="px-8 py-3 rounded-full text-on-primary stellar-gradient font-bold text-sm shadow-xl shadow-primary/10 transition-all hover:opacity-90 active:scale-95 duration-200 flex items-center gap-2"
            >
              <span>View in Shopify</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          )}
          {product.status === "published" && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="unpublish" />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-full text-primary bg-surface-container-high font-medium text-sm transition-all hover:bg-surface-bright active:scale-95 duration-200"
              >
                Unpublish
              </button>
            </fetcher.Form>
          )}
          <button
            disabled={isSubmitting}
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Delete Product",
                message: "Delete this product permanently? This cannot be undone.",
                confirmLabel: "Delete",
                variant: "danger",
              });
              if (!ok) return;
              const fd = new FormData();
              fd.set("intent", "delete");
              fetcher.submit(fd, { method: "post" });
            }}
            className="w-11 h-11 rounded-full bg-surface-container-high hover:bg-red-500/20 text-on-surface-variant hover:text-red-400 flex items-center justify-center transition-colors"
            aria-label="Delete product"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </div>

      {fetcher.data?.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{fetcher.data.error}</p>
        </div>
      )}

      {/* Main Grid: 7 / 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: 7 col — Visuals */}
        <div className="lg:col-span-7 space-y-8">
          {/* Main Preview */}
          <div className="bg-surface-container-low rounded-xl overflow-hidden aspect-[4/5] flex items-center justify-center relative group">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.title}
                className="w-full h-full object-contain p-8"
              />
            ) : (
              <span className="material-symbols-outlined text-6xl text-on-surface-variant/30">
                image
              </span>
            )}

            {isMockupPending && (
              <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating mockup...
              </div>
            )}

            {images[activeImage]?.label && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <p className="text-white/80 font-headline text-sm">
                  {images[activeImage].label}
                </p>
              </div>
            )}
          </div>

          {/* Thumbnails strip */}
          {images.length > 0 && (
            <div className="grid grid-cols-5 gap-4">
              {images.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`aspect-square rounded-lg overflow-hidden transition-all ${
                    activeImage === idx
                      ? "border-2 border-primary ring-2 ring-primary/20"
                      : "border border-outline-variant/10 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-full object-contain p-2 bg-surface-container-high"
                  />
                </button>
              ))}
              {images.length < 5 &&
                Array.from({ length: 5 - images.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square rounded-lg bg-surface-container-high flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-outline text-xl">
                      add_photo_alternate
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Configurator: Colors + Sizes */}
          {(colors.length > 0 || sizes.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {colors.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                    Available Colors ({colors.length})
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    {colors.map((color) => {
                      const hex = colorHexMap[color] || getDefaultColorHex(color);
                      const isActive = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          title={color}
                          className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${
                            isActive
                              ? "border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-surface"
                              : "border-outline-variant/30"
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {sizes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                    Size Selection
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => {
                      const isActive = selectedSize === size;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-2 rounded text-sm font-bold transition-colors ${
                            isActive
                              ? "bg-surface-container-highest text-on-surface border border-primary/40"
                              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-transparent"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: 5 col — Business data */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pricing Breakdown */}
          <section className="bg-surface-container-low rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-headline font-bold text-lg">
                Pricing Breakdown
              </h2>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-full border border-indigo-500/20">
                USDC Settlement
              </span>
            </div>
            <div className="space-y-3 font-mono text-sm">
              <PricingRow label="Retail Price" value={product.retailPrice} bold />
              <PricingRow label="Manufacturing Base" value={product.baseCost} />
              <PricingRow label="Stellar Tx Fee" value={stellarTxFee} />
              <PricingRow
                label="Escrow Holding (2%)"
                value={escrowHolding}
              />
              <PricingRow
                label="Platform Fee (5%)"
                value={platformFee}
              />
              <div className="h-px bg-outline-variant opacity-20 my-2"></div>
              <div className="flex justify-between items-end">
                <span className="text-xs uppercase font-bold text-slate-500">
                  Total Unit Cost
                </span>
                <span className="text-2xl font-bold text-secondary">
                  {totalUnitCost.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-on-surface-variant">
                  Your Profit
                </span>
                <span
                  className={`font-bold ${
                    profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  ${profit.toFixed(2)}{" "}
                  <span className="text-xs opacity-70">
                    ({profitPercent.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </section>

          {/* Manufacturing Provider */}
          {provider && (
            <section className="bg-surface-container-low rounded-xl p-6">
              <h2 className="font-headline font-bold text-lg mb-6">
                Manufacturing Provider
              </h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg stellar-gradient flex items-center justify-center text-white font-bold text-lg">
                  {provider.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-on-surface truncate">
                    {provider.name}
                  </h3>
                  {provider.verified && (
                    <div className="flex items-center gap-1">
                      <span
                        className="material-symbols-outlined text-[12px] text-green-500"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                        Verified Stellar Node
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-high p-4 rounded-lg">
                  <p className="text-[10px] text-on-surface-variant uppercase mb-1">
                    Production Time
                  </p>
                  <p className="text-lg font-bold font-headline">
                    {providerProduct?.productionDays || provider.avgLeadDays}{" "}
                    Days
                  </p>
                </div>
                <div className="bg-surface-container-high p-4 rounded-lg">
                  <p className="text-[10px] text-on-surface-variant uppercase mb-1">
                    Pass Rate
                  </p>
                  <p className="text-lg font-bold font-headline text-green-400">
                    {provider.completionRate
                      ? (provider.completionRate * 100).toFixed(1)
                      : "—"}
                    %
                  </p>
                </div>
              </div>
              <Link
                to={`/providers?provider=${provider.id}`}
                className="mt-4 block text-xs text-primary hover:underline"
              >
                View provider profile →
              </Link>
            </section>
          )}

          {/* Sales Performance */}
          {sales && (
            <section className="bg-surface-container-low rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline font-bold text-lg">
                  Sales Performance
                </h2>
                <span
                  className={`text-xs font-bold ${
                    sales.changePercent >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {sales.changePercent >= 0 ? "+" : ""}
                  {sales.changePercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-24 w-full flex items-end gap-1 mb-4">
                {sales.dailyBuckets.map((count, idx) => {
                  const heightPct = (count / maxBucket) * 100;
                  const isLast = idx === sales.dailyBuckets.length - 1;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-t group relative transition-colors ${
                        isLast ? "bg-secondary" : "bg-secondary/10 hover:bg-secondary/40"
                      }`}
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-bright text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                <span>7 days ago</span>
                <span>Today</span>
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-outline-variant/10">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase">
                    Units sold
                  </p>
                  <p className="font-bold text-lg font-headline">
                    {sales.totalUnits}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-on-surface-variant uppercase">
                    Revenue
                  </p>
                  <p className="font-bold text-lg font-headline text-secondary">
                    ${sales.totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Store Connector */}
          <section className="bg-surface-container-low rounded-xl p-6 relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-slate-700">
                link
              </span>
            </div>
            <h2 className="font-headline font-bold text-lg mb-4">
              Store Connector
            </h2>
            <div className="flex items-center gap-4 bg-surface-container-highest/50 p-4 rounded-lg border border-outline-variant/10">
              <div className="w-10 h-10 rounded bg-[#95BF47] flex items-center justify-center text-white">
                <span className="material-symbols-outlined">shopping_bag</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-on-surface truncate">
                  {product.title}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-mono">
                  {product.shopifyProductId
                    ? `shopify_prod_${product.shopifyProductId}`
                    : "Not connected"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              {product.status === "published" ? (
                <span className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  Live on Storefront
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {product.status === "draft" ? "Draft" : product.status}
                </span>
              )}
              <span className="text-[10px] text-slate-500">
                Syncing via Stellar Oracle
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* Additional Details: Technical Specs + Smart Contract Rules */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Technical Specs */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-headline">Technical Specs</h2>
          <div className="grid grid-cols-2 gap-y-6 border-l-2 border-primary/20 pl-6">
            {specs.map((spec) => (
              <div key={spec.label}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  {spec.label}
                </p>
                <p className="text-sm font-medium">{typeof spec.value === "string" ? spec.value.replace(/<[^>]*>/g, "") : spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Contract Rules */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold font-headline">
            Smart Contract Rules
          </h2>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <ul className="space-y-4">
              {rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-lg">
                    {rule.icon}
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-on-surface">{rule.title}</p>
                    <p className="text-slate-400">{rule.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Variants table (full width, collapsed by default) */}
      {(providerProduct?.variants?.length ?? 0) > 0 && (
        <details className="bg-surface-container-low rounded-xl overflow-hidden">
          <summary className="px-6 py-4 cursor-pointer hover:bg-surface-container transition-colors">
            <span className="font-bold font-headline">
              All Variants ({providerProduct?.variants?.length || 0})
            </span>
          </summary>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em] border-t border-outline-variant/10">
                  <th className="px-6 py-3 font-semibold">Size</th>
                  <th className="px-6 py-3 font-semibold">Color</th>
                  <th className="px-6 py-3 font-semibold font-mono">SKU</th>
                  <th className="px-6 py-3 font-semibold text-right">+Cost</th>
                  <th className="px-6 py-3 font-semibold">Stock</th>
                </tr>
              </thead>
              <tbody className="font-headline">
                {providerProduct?.variants?.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-surface-bright transition-colors"
                  >
                    <td className="px-6 py-3 font-medium">{v.size}</td>
                    <td className="px-6 py-3 text-on-surface-variant">
                      {v.color}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-on-surface-variant">
                      {v.sku}
                    </td>
                    <td className="px-6 py-3 font-mono text-right">
                      ${v.additionalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      {v.inStock ? (
                        <span className="text-green-400 text-xs font-bold uppercase">
                          In Stock
                        </span>
                      ) : (
                        <span className="text-red-400 text-xs font-bold uppercase">
                          Out
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </AnimatedPage>
  );
}

function PricingRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-on-surface-variant">
      <span className={bold ? "font-bold text-on-surface" : ""}>{label}</span>
      <span className={bold ? "font-bold text-on-surface" : "text-on-surface"}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    draft: {
      label: "Draft",
      cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    publishing: {
      label: "Publishing",
      cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    },
    published: {
      label: "Live",
      cls: "bg-green-500/10 text-green-400 border-green-500/20",
    },
    error: {
      label: "Error",
      cls: "bg-red-500/10 text-red-400 border-red-500/20",
    },
  };
  const c = config[status] || config.draft;
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${c.cls}`}
    >
      {c.label}
    </span>
  );
}

/** Fallback color hex mapping when variant doesn't have colorHex set. */
function getDefaultColorHex(color: string): string {
  const map: Record<string, string> = {
    Black: "#121317",
    White: "#E5E7EB",
    "Dark Blue": "#1F2937",
    Blue: "#4F46E5",
    Red: "#DC2626",
    Green: "#16A34A",
    Yellow: "#EAB308",
    Orange: "#EA580C",
    Pink: "#EC4899",
    Gray: "#6B7280",
    Navy: "#1E3A8A",
    Clear: "#9CA3AF",
    Charcoal: "#374151",
    Camel: "#A0826D",
    "Dark Green": "#065F46",
    "Golden Yellow": "#EAB308",
  };
  return map[color] || "#6366F1";
}
