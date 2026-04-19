import { useCallback, useState } from "react";
import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher } from "@remix-run/react";
import { apiGet, apiPost, apiDelete , deriveStoreId } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type {
  Provider,
  StoreProvider,
  ProviderProduct,
  PaginatedResponse,
} from "~/lib/types";
import { PageHeader, EmptyState } from "~/components/ui/PageHeader";
import { Pill } from "~/components/ui/StatusPill";
import { LinkButton, Button } from "~/components/ui/Button";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { StaggerList, StaggerItem } from "~/components/ui/StaggerList";
import { EmptyState as AnimatedEmptyState } from "~/components/ui/EmptyState";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Print Providers",
    description:
      "Discover verified print-on-demand partners on the Stellar network. Compare quality, lead times, specialties and browse their blank catalog.",
    path: "/providers",
    noIndex: true,
  });


const COUNTRIES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Countries" },
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "AU", label: "Australia" },
  { value: "CA", label: "Canada" },
  { value: "JP", label: "Japan" },
  { value: "VN", label: "Vietnam" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
];
const SPECIALTIES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Specialties" },
  { value: "dtg", label: "Direct to Garment (DTG)" },
  { value: "sublimation", label: "Sublimation" },
  { value: "embroidery", label: "Embroidery" },
  { value: "all-over-print", label: "All-Over Print" },
  { value: "screen-print", label: "Screen Print" },
  { value: "cut-and-sew", label: "Cut & Sew" },
  { value: "engraving", label: "Engraving" },
];
const PRODUCT_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "All Types" },
  { value: "t-shirt", label: "T-Shirts" },
  { value: "hoodie", label: "Hoodies" },
  { value: "mug", label: "Mugs" },
  { value: "poster", label: "Posters" },
  { value: "tote-bag", label: "Tote Bags" },
  { value: "phone-case", label: "Phone Cases" },
  { value: "other", label: "Other" },
];

/** Map country codes to flag emoji + name for display */
const COUNTRY_DISPLAY: Record<string, { flag: string; name: string }> = {
  US: { flag: "\u{1F1FA}\u{1F1F8}", name: "United States" },
  UK: { flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom" },
  DE: { flag: "\u{1F1E9}\u{1F1EA}", name: "Germany" },
  AU: { flag: "\u{1F1E6}\u{1F1FA}", name: "Australia" },
  CA: { flag: "\u{1F1E8}\u{1F1E6}", name: "Canada" },
  JP: { flag: "\u{1F1EF}\u{1F1F5}", name: "Japan" },
  VN: { flag: "\u{1F1FB}\u{1F1F3}", name: "Vietnam" },
  CN: { flag: "\u{1F1E8}\u{1F1F3}", name: "China" },
  IN: { flag: "\u{1F1EE}\u{1F1F3}", name: "India" },
};
function countryLabel(code: string) {
  const c = COUNTRY_DISPLAY[code];
  return c ? `${c.flag} ${c.name}` : code;
}

type Tab = "providers" | "catalog";

interface LoaderData {
  tab: Tab;
  providers: Provider[];
  connectedProviderIds: string[];
  providersMeta: PaginatedResponse<Provider>["meta"] | null;
  blanks: ProviderProduct[];
  blanksMeta: PaginatedResponse<ProviderProduct>["meta"] | null;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const url = new URL(request.url);
  const tab: Tab = url.searchParams.get("tab") === "catalog" ? "catalog" : "providers";
  const page = url.searchParams.get("page") || "1";

  // Connected provider IDs are needed by both tabs
  const connectedPromise = apiGet<StoreProvider[]>(
    `/providers/store/${deriveStoreId(walletAddress)}`,
    walletAddress,
  );

  if (tab === "catalog") {
    const productType = url.searchParams.get("productType") || "";
    const blanksParams = new URLSearchParams();
    blanksParams.set("page", page);
    blanksParams.set("limit", "24");
    if (productType)
      blanksParams.set("productType", productType);

    const [blanksResult, connectedResult] = await Promise.all([
      apiGet<PaginatedResponse<ProviderProduct>>(
        `/provider-products?${blanksParams.toString()}`,
        walletAddress,
      ),
      connectedPromise,
    ]);

    return json<LoaderData>({
      tab,
      providers: [],
      connectedProviderIds: Array.isArray(connectedResult.data)
        ? connectedResult.data.map((sp) => sp.providerId)
        : [],
      providersMeta: null,
      blanks: blanksResult.data?.data ?? [],
      blanksMeta: blanksResult.data?.meta ?? null,
      error: blanksResult.error,
    });
  }

  // Providers tab
  const country = url.searchParams.get("country") || "";
  const specialty = url.searchParams.get("specialty") || "";
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (specialty) params.set("specialty", specialty);
  params.set("verified", "true");
  params.set("page", page);

  const [providersResult, connectedResult] = await Promise.all([
    apiGet<PaginatedResponse<Provider>>(
      `/providers/search?${params.toString()}`,
      walletAddress,
    ),
    connectedPromise,
  ]);

  return json<LoaderData>({
    tab,
    providers: providersResult.data?.data ?? [],
    connectedProviderIds: Array.isArray(connectedResult.data)
      ? connectedResult.data.map((sp) => sp.providerId)
      : [],
    providersMeta: providersResult.data?.meta ?? null,
    blanks: [],
    blanksMeta: null,
    error: providersResult.error,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const providerId = formData.get("providerId") as string;
  if (!providerId)
    return json({ error: "Missing providerId" }, { status: 400 });

  if (intent === "connect") {
    const r = await apiPost(
      "/providers/connect",
      { storeId: deriveStoreId(walletAddress), providerId },
      walletAddress,
    );
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "disconnect") {
    const r = await apiDelete(
      `/providers/disconnect?storeId=${deriveStoreId(walletAddress)}&providerId=${providerId}`,
      walletAddress,
    );
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  return json({ error: "Unknown intent" }, { status: 400 });
}

function starRating(n: number) {
  const full = Math.floor(n);
  const empty = 5 - full;
  return "★".repeat(full) + "☆".repeat(empty);
}

export default function Providers() {
  const {
    tab,
    providers,
    connectedProviderIds,
    providersMeta,
    blanks,
    blanksMeta,
    error,
  } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<{ error?: string }>();
  const [selected, setSelected] = useState<ProviderProduct | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const switchTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams);
      if (next === "catalog") params.set("tab", "catalog");
      else params.delete("tab");
      // Reset pagination when switching tabs
      params.delete("page");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const handleConnect = useCallback(
    (providerId: string) => {
      const isConnected = connectedProviderIds.includes(providerId);
      const formData = new FormData();
      formData.set("intent", isConnected ? "disconnect" : "connect");
      formData.set("providerId", providerId);
      fetcher.submit(formData, { method: "POST" });
    },
    [connectedProviderIds, fetcher],
  );

  return (
    <AnimatedPage>
      <PageHeader
        title="Print Providers"
        subtitle="Browse partners on the Stellar network and their blank catalog"
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-full w-fit">
        <button
          onClick={() => switchTab("providers")}
          className={
            tab === "providers"
              ? "stellar-gradient text-white px-5 py-2 rounded-full text-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface px-5 py-2 rounded-full text-sm font-medium transition-colors"
          }
        >
          Providers
        </button>
        <button
          onClick={() => switchTab("catalog")}
          className={
            tab === "catalog"
              ? "stellar-gradient text-white px-5 py-2 rounded-full text-sm font-bold"
              : "text-on-surface-variant hover:text-on-surface px-5 py-2 rounded-full text-sm font-medium transition-colors"
          }
        >
          Blank Catalog
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{error}</p>
        </div>
      )}
      {fetcher.data?.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{fetcher.data.error}</p>
        </div>
      )}

      {tab === "providers" ? (
        <ProvidersTab
          providers={providers}
          connectedProviderIds={connectedProviderIds}
          meta={providersMeta}
          searchParams={searchParams}
          setParam={setParam}
          onConnect={handleConnect}
        />
      ) : (
        <CatalogTab
          blanks={blanks}
          meta={blanksMeta}
          currentType={searchParams.get("productType") || ""}
          onTypeChange={(t) => setParam("productType", t)}
          onOpenDetail={setSelected}
          onPageChange={(p) => setParam("page", String(p))}
        />
      )}

      {selected && (
        <BlankDetailModal blank={selected} onClose={() => setSelected(null)} />
      )}
    </AnimatedPage>
  );
}

// ─── Providers tab ──────────────────────────────────────────────────

function ProvidersTab({
  providers,
  connectedProviderIds,
  meta,
  searchParams,
  setParam,
  onConnect,
}: {
  providers: Provider[];
  connectedProviderIds: string[];
  meta: PaginatedResponse<Provider>["meta"] | null;
  searchParams: URLSearchParams;
  setParam: (key: string, value: string) => void;
  onConnect: (providerId: string) => void;
}) {
  const countryFilter = searchParams.get("country") || "";
  const specialtyFilter = searchParams.get("specialty") || "";
  const searchQuery = searchParams.get("q") || "";

  const filtered = searchQuery
    ? providers.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : providers;

  return (
    <>
      <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search providers by name..."
            className="w-full bg-surface-container pl-12 pr-4 py-3 rounded-full text-sm border-0 focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Country
            </label>
            <select
              value={countryFilter}
              onChange={(e) => setParam("country", e.target.value)}
              className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Specialty
            </label>
            <select
              value={specialtyFilter}
              onChange={(e) => setParam("specialty", e.target.value)}
              className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
            >
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant font-mono">
        {meta?.total ?? filtered.length} providers •{" "}
        <span className="text-green-400">
          {connectedProviderIds.length} connected
        </span>
      </p>

      {filtered.length === 0 ? (
        <AnimatedEmptyState
          icon="local_shipping"
          title="No providers connected"
          description="Connect a print provider to start fulfilling orders."
        />
      ) : (
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const isConnected = connectedProviderIds.includes(p.id);
            return (
              <StaggerItem key={p.id} className="h-full">
              <div
                className="bg-surface-container-low p-6 rounded-2xl space-y-4 hover:bg-surface-container transition-colors flex flex-col h-full"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl stellar-gradient flex items-center justify-center text-white font-bold text-lg">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold font-headline">{p.name}</h3>
                      <p className="text-xs text-on-surface-variant">
                        {countryLabel(p.country)}
                      </p>
                    </div>
                  </div>
                  {p.verified && (
                    <span
                      className="material-symbols-outlined text-primary"
                      aria-label="verified"
                    >
                      verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">
                    {starRating(p.rating)}
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">
                    {p.rating.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-container-high p-2 rounded-xl">
                    <p className="font-mono font-bold text-xs">
                      {p.totalOrders}
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase">
                      Orders
                    </p>
                  </div>
                  <div className="bg-surface-container-high p-2 rounded-xl">
                    <p className="font-mono font-bold text-xs">
                      {Math.round(p.completionRate * 100)}%
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase">
                      Rate
                    </p>
                  </div>
                  <div className="bg-surface-container-high p-2 rounded-xl">
                    <p className="font-mono font-bold text-xs">
                      {p.avgLeadDays}d
                    </p>
                    <p className="text-[10px] text-on-surface-variant uppercase">
                      Lead
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {p.specialties.slice(0, 3).map((s) => (
                    <Pill key={s} tone="indigo">
                      {s}
                    </Pill>
                  ))}
                </div>

                <div className="pt-2 mt-auto flex-shrink-0">
                  <button
                    onClick={() => onConnect(p.id)}
                    className={
                      isConnected
                        ? "w-full py-2.5 rounded-full bg-green-500/10 text-green-400 border border-green-400/20 text-xs font-bold uppercase tracking-wider hover:bg-green-500/20 transition-colors"
                        : "w-full py-2.5 rounded-full stellar-gradient text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all"
                    }
                  >
                    {isConnected ? "✓ Connected" : "Connect"}
                  </button>
                </div>
              </div>
              </StaggerItem>
            );
          })}
        </StaggerList>
      )}
    </>
  );
}

// ─── Blank catalog tab ─────────────────────────────────────────────

function CatalogTab({
  blanks,
  meta,
  currentType,
  onTypeChange,
  onOpenDetail,
  onPageChange,
}: {
  blanks: ProviderProduct[];
  meta: PaginatedResponse<ProviderProduct>["meta"] | null;
  currentType: string;
  onTypeChange: (t: string) => void;
  onOpenDetail: (p: ProviderProduct) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      {/* Filter chips */}
      <section className="bg-surface-container-low rounded-2xl p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-2">
            Filter:
          </span>
          {PRODUCT_TYPES.map((type) => {
            const active = currentType === type.value;
            return (
              <button
                key={type.value || "_all"}
                onClick={() => onTypeChange(type.value)}
                className={
                  active
                    ? "stellar-gradient text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                }
              >
                {type.label}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-on-surface-variant font-mono">
            {meta?.total ?? blanks.length} blank
            {(meta?.total ?? blanks.length) !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {blanks.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl">
          <EmptyState
            icon="storefront"
            title="No blanks found"
            description="Try adjusting the filter or connecting more providers."
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {blanks.map((pp) => {
            const img = Object.values(pp.blankImages)[0];
            const sizes = pp.variants
              ? [...new Set(pp.variants.map((v) => v.size))]
              : [];
            const colors = pp.variants
              ? [...new Set(pp.variants.map((v) => v.color))]
              : [];
            return (
              <div
                key={pp.id}
                className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-4 rounded-2xl flex flex-col"
              >
                <button
                  onClick={() => onOpenDetail(pp)}
                  className="text-left group"
                >
                  <div className="w-full h-44 rounded-xl bg-surface-container-highest mb-4 flex items-center justify-center overflow-hidden">
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
                  <h3 className="font-bold mb-1 group-hover:text-primary transition-colors truncate">
                    {pp.name}
                  </h3>
                  {pp.brand && (
                    <p className="text-xs text-on-surface-variant">
                      {pp.brand}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-[10px] font-bold uppercase">
                      {pp.productType}
                    </span>
                    <span className="font-mono font-bold">
                      ${pp.baseCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {sizes.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant">
                        Sizes: {sizes.slice(0, 5).join(", ")}
                        {sizes.length > 5 && "…"}
                      </p>
                    )}
                    {colors.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant">
                        {colors.length} colors available
                      </p>
                    )}
                    <p className="text-[10px] text-on-surface-variant">
                      {pp.productionDays} day
                      {pp.productionDays !== 1 ? "s" : ""} production
                    </p>
                  </div>
                </button>
                <div className="mt-4">
                  <LinkButton
                    to={`/products/new?blank=${pp.id}`}
                    icon="arrow_forward"
                    className="!w-full !px-4 !py-2 !text-xs"
                  >
                    Use this blank
                  </LinkButton>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <section className="bg-surface-container-low rounded-2xl px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">
            Page {meta.page} / {meta.totalPages}
          </span>
          <div className="flex items-center gap-2">
            {meta.page > 1 && (
              <Button
                variant="secondary"
                className="!py-2"
                onClick={() => onPageChange(meta.page - 1)}
              >
                Previous
              </Button>
            )}
            {meta.page < meta.totalPages && (
              <Button
                variant="secondary"
                className="!py-2"
                onClick={() => onPageChange(meta.page + 1)}
              >
                Next
              </Button>
            )}
          </div>
        </section>
      )}
    </>
  );
}

// ─── Blank detail modal ────────────────────────────────────────────

function BlankDetailModal({
  blank,
  onClose,
}: {
  blank: ProviderProduct;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold font-headline">{blank.name}</h2>
              {blank.brand && (
                <p className="text-sm text-on-surface-variant">{blank.brand}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex gap-6 flex-col sm:flex-row">
            <div className="w-full sm:w-52 h-52 rounded-2xl bg-surface-container-highest flex items-center justify-center overflow-hidden">
              {Object.values(blank.blankImages)[0] ? (
                <img
                  src={Object.values(blank.blankImages)[0]}
                  alt={blank.name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
                  checkroom
                </span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-[#6366F1]/10 text-[#6366F1] text-xs font-bold uppercase">
                  {blank.productType}
                </span>
                <span className="font-mono font-bold text-2xl">
                  ${blank.baseCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono">
                Production: {blank.productionDays} day
                {blank.productionDays !== 1 ? "s" : ""}
              </p>
              {blank.weightGrams && (
                <p className="text-xs text-on-surface-variant font-mono">
                  Weight: {blank.weightGrams}g
                </p>
              )}
              {blank.description && (
                <div
                  className="text-sm text-on-surface-variant [&_ul]:list-disc [&_ul]:pl-4 [&_li]:text-on-surface-variant [&_p]:mb-2 [&_span.wysiwyg]:contents"
                  dangerouslySetInnerHTML={{ __html: blank.description }}
                />
              )}
            </div>
          </div>

          {blank.printAreas.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                Print Areas
              </h3>
              <div className="flex gap-2 flex-wrap">
                {blank.printAreas.map((pa) => (
                  <div
                    key={pa.name}
                    className="bg-surface-container-low px-3 py-2 rounded-xl text-xs"
                  >
                    <span className="font-bold">{pa.name}</span>
                    <span className="text-on-surface-variant ml-2 font-mono">
                      {pa.widthPx}×{pa.heightPx}px @ {pa.dpi}dpi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(blank.variants?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                Variants ({blank.variants?.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                      <th className="px-4 py-2 text-left">Size</th>
                      <th className="px-4 py-2 text-left">Color</th>
                      <th className="px-4 py-2 text-left font-mono">SKU</th>
                      <th className="px-4 py-2 text-right">+Cost</th>
                      <th className="px-4 py-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="font-headline">
                    {blank.variants?.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-surface-bright transition-colors"
                      >
                        <td className="px-4 py-2">{v.size}</td>
                        <td className="px-4 py-2 text-on-surface-variant">
                          {v.color}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-on-surface-variant">
                          {v.sku}
                        </td>
                        <td className="px-4 py-2 font-mono text-right">
                          {v.additionalCost > 0
                            ? `+$${v.additionalCost.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {v.inStock ? (
                            <span className="text-green-400 text-[10px] font-bold">
                              IN
                            </span>
                          ) : (
                            <span className="text-red-400 text-[10px] font-bold">
                              OUT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <LinkButton
              to={`/products/new?blank=${blank.id}`}
              icon="add"
            >
              Create Product With This
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
