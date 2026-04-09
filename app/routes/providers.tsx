import { useCallback } from "react";
import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useFetcher } from "@remix-run/react";
import { apiGet, apiPost, apiDelete } from "~/lib/api";
import type {
  Provider,
  StoreProvider,
  PaginatedResponse,
} from "~/lib/types";
import { PageHeader, EmptyState } from "~/components/ui/PageHeader";
import { Pill } from "~/components/ui/StatusPill";

export const meta: MetaFunction = () => [
  { title: "StellarPOD — Providers" },
];

const STORE_ID = "demo-store";

const COUNTRIES = ["", "United States", "Germany", "Japan", "Brazil", "Sweden"];
const SPECIALTIES = [
  "",
  "T-Shirts",
  "Hoodies",
  "Posters",
  "Mugs",
  "Phone Cases",
  "Canvas",
];

interface LoaderData {
  providers: Provider[];
  connectedProviderIds: string[];
  meta: PaginatedResponse<Provider>["meta"] | null;
  error: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country") || "";
  const specialty = url.searchParams.get("specialty") || "";
  const page = url.searchParams.get("page") || "1";

  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (specialty) params.set("specialty", specialty);
  params.set("verified", "true");
  params.set("page", page);

  const [providersResult, connectedResult] = await Promise.all([
    apiGet<PaginatedResponse<Provider>>(
      `/providers/search?${params.toString()}`,
    ),
    apiGet<StoreProvider[]>(`/providers/connected/${STORE_ID}`),
  ]);

  if (providersResult.error) {
    return json<LoaderData>({
      providers: [],
      connectedProviderIds: [],
      meta: null,
      error: providersResult.error,
    });
  }

  const connectedIds = Array.isArray(connectedResult.data)
    ? connectedResult.data.map((sp) => sp.providerId)
    : [];

  return json<LoaderData>({
    providers: providersResult.data?.data ?? [],
    connectedProviderIds: connectedIds,
    meta: providersResult.data?.meta ?? null,
    error: null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const providerId = formData.get("providerId") as string;
  if (!providerId)
    return json({ error: "Missing providerId" }, { status: 400 });

  if (intent === "connect") {
    const r = await apiPost("/providers/connect", {
      storeId: STORE_ID,
      providerId,
    });
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "disconnect") {
    const r = await apiDelete(
      `/providers/disconnect?storeId=${STORE_ID}&providerId=${providerId}`,
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
  const { providers, connectedProviderIds, meta: pagination, error } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<{ error?: string }>();

  const countryFilter = searchParams.get("country") || "";
  const specialtyFilter = searchParams.get("specialty") || "";
  const searchQuery = searchParams.get("q") || "";

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

  const filtered = searchQuery
    ? providers.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : providers;

  return (
    <>
      <PageHeader
        title="Print Providers"
        subtitle="Connect with verified partners on the Stellar network"
      />

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

      {/* Filter card */}
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
                <option key={c} value={c}>
                  {c || "All Countries"}
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
                <option key={s} value={s}>
                  {s || "All Specialties"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <p className="text-xs text-on-surface-variant font-mono">
        {pagination?.total ?? filtered.length} providers •{" "}
        <span className="text-green-400">
          {connectedProviderIds.length} connected
        </span>
      </p>

      {filtered.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl">
          <EmptyState
            icon="local_shipping"
            title="No providers found"
            description="Try adjusting your filters or search."
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const isConnected = connectedProviderIds.includes(p.id);
            return (
              <div
                key={p.id}
                className="bg-surface-container-low p-6 rounded-2xl space-y-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl stellar-gradient flex items-center justify-center text-white font-bold text-lg">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold font-headline">{p.name}</h3>
                      <p className="text-xs text-on-surface-variant">
                        {p.country}
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
                      {p.completionRate}%
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

                <div className="flex flex-wrap gap-1">
                  {p.specialties.slice(0, 3).map((s) => (
                    <Pill key={s} tone="indigo">
                      {s}
                    </Pill>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleConnect(p.id)}
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
            );
          })}
        </section>
      )}
    </>
  );
}
