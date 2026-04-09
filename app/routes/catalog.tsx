import { useState, useCallback } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type { ProviderProduct, PaginatedResponse } from "~/lib/types";
import { PageHeader, EmptyState } from "~/components/ui/PageHeader";
import { Button, LinkButton } from "~/components/ui/Button";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Provider Catalog",
    description:
      "Browse blank products from verified print-on-demand providers. Filter by garment type, price and lead time to find the perfect blank.",
    path: "/catalog",
    noIndex: true,
  });

const PRODUCT_TYPES = [
  "",
  "T-Shirt",
  "Hoodie",
  "Mug",
  "Poster",
  "Tote Bag",
];

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const url = new URL(request.url);
  const productType = url.searchParams.get("productType") || "";
  const page = url.searchParams.get("page") || "1";

  let endpoint = `/provider-products?page=${page}&limit=20`;
  if (productType) endpoint += `&productType=${encodeURIComponent(productType)}`;

  const res = await apiGet<PaginatedResponse<ProviderProduct>>(
    endpoint,
    walletAddress,
  );
  return json({
    products:
      res.data?.data ?? (res.data as unknown as ProviderProduct[]) ?? [],
    meta: res.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    error: res.error,
  });
}

export default function Catalog() {
  const { products, meta: pagination, error } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<ProviderProduct | null>(null);

  const currentType = searchParams.get("productType") || "";

  const handleType = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        if (value) prev.set("productType", value);
        else prev.delete("productType");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  return (
    <>
      <PageHeader
        title="Product Catalog"
        subtitle="Browse blanks from all connected providers"
        actions={
          <LinkButton to="/products/new" icon="add">
            Start a Product
          </LinkButton>
        }
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filter Chips */}
      <section className="bg-surface-container-low rounded-2xl p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-2">
            Filter:
          </span>
          {PRODUCT_TYPES.map((type) => {
            const label = type || "All Types";
            const active = currentType === type;
            return (
              <button
                key={label}
                onClick={() => handleType(type)}
                className={
                  active
                    ? "stellar-gradient text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                }
              >
                {label}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-on-surface-variant font-mono">
            {pagination.total} result{pagination.total !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Products Grid */}
      {products.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl">
          <EmptyState
            icon="storefront"
            title="No products found"
            description="Try adjusting your filter or connecting more providers."
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((pp) => {
            const img = Object.values(pp.blankImages)[0];
            const sizes = pp.variants
              ? [...new Set(pp.variants.map((v) => v.size))]
              : [];
            const colors = pp.variants
              ? [...new Set(pp.variants.map((v) => v.color))]
              : [];
            return (
              <button
                key={pp.id}
                onClick={() => setSelected(pp)}
                className="bg-surface-container-low hover:bg-surface-container-high transition-colors p-4 rounded-2xl text-left group"
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
                  <p className="text-xs text-on-surface-variant">{pp.brand}</p>
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
            );
          })}
        </section>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <section className="bg-surface-container-low rounded-2xl px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Button
                variant="secondary"
                className="!py-2"
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
                variant="secondary"
                className="!py-2"
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
          </div>
        </section>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-surface-container rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-headline">
                    {selected.name}
                  </h2>
                  {selected.brand && (
                    <p className="text-sm text-on-surface-variant">
                      {selected.brand}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-10 h-10 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex gap-6 flex-col sm:flex-row">
                <div className="w-full sm:w-52 h-52 rounded-2xl bg-surface-container-highest flex items-center justify-center overflow-hidden">
                  {Object.values(selected.blankImages)[0] ? (
                    <img
                      src={Object.values(selected.blankImages)[0]}
                      alt={selected.name}
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
                      {selected.productType}
                    </span>
                    <span className="font-mono font-bold text-2xl">
                      ${selected.baseCost.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Production: {selected.productionDays} day
                    {selected.productionDays !== 1 ? "s" : ""}
                  </p>
                  {selected.weightGrams && (
                    <p className="text-xs text-on-surface-variant font-mono">
                      Weight: {selected.weightGrams}g
                    </p>
                  )}
                  {selected.description && (
                    <p className="text-sm text-on-surface-variant">
                      {selected.description}
                    </p>
                  )}
                </div>
              </div>

              {selected.printAreas.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                    Print Areas
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {selected.printAreas.map((pa) => (
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

              {(selected.variants?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                    Variants ({selected.variants?.length})
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
                        {selected.variants?.map((v) => (
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
                <Button
                  variant="secondary"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
                <LinkButton to="/products/new" icon="add">
                  Create Product With This
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
