import { useCallback } from "react";
import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useNavigate,
  useSearchParams,
  useFetcher,
  Link,
} from "@remix-run/react";
import { apiGet, apiPost, apiDelete } from "~/lib/api";
import type {
  MerchantProduct,
  PaginatedResponse,
} from "~/lib/types";
import { PageHeader, EmptyState } from "~/components/ui/PageHeader";
import { LinkButton, Button } from "~/components/ui/Button";
import { ProductPill } from "~/components/ui/StatusPill";

export const meta: MetaFunction = () => [
  { title: "StellarPOD — Products" },
];

const STORE_ID = "demo-store";

const TAB_MAP: Record<number, string> = { 0: "", 1: "draft", 2: "published" };

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = url.searchParams.get("page") || "1";

  let endpoint = `/products/store/${STORE_ID}?page=${page}&limit=20`;
  if (status) endpoint += `&status=${status}`;

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
  const productId = formData.get("productId") as string;
  if (!productId)
    return json({ error: "Missing productId" }, { status: 400 });

  if (intent === "publish") {
    const r = await apiPost(`/products/${productId}/publish`, {});
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "unpublish") {
    const r = await apiPost(`/products/${productId}/unpublish`, {});
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }
  if (intent === "delete") {
    const r = await apiDelete(`/products/${productId}`);
    return r.error
      ? json({ error: r.error }, { status: r.status || 500 })
      : json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function Products() {
  const { products, meta: pagination, error } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<{ error?: string }>();

  const currentStatus = searchParams.get("status") || "";
  const selectedTab =
    currentStatus === "draft" ? 1 : currentStatus === "published" ? 2 : 0;

  const handleTab = useCallback(
    (i: number) => {
      setSearchParams((prev) => {
        const s = TAB_MAP[i];
        if (s) prev.set("status", s);
        else prev.delete("status");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const tabs = ["All", "Draft", "Published"];

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Manage your print-on-demand catalog"
        actions={
          <LinkButton to="/products/new" icon="add">
            Create Product
          </LinkButton>
        }
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Error loading products</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      )}
      {fetcher.data?.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Action failed</p>
          <p className="text-xs opacity-80">{fetcher.data.error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-surface-container-low p-2 rounded-full w-fit">
        {tabs.map((label, i) => (
          <button
            key={label}
            onClick={() => handleTab(i)}
            className={
              selectedTab === i
                ? "stellar-gradient text-white px-5 py-2 rounded-full text-sm font-bold"
                : "text-on-surface-variant hover:text-on-surface px-5 py-2 rounded-full text-sm font-medium transition-colors"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl">
          <EmptyState
            icon="inventory_2"
            title="Create your first product"
            description="Choose a blank from the catalog, add your design, set your price, and publish to Shopify."
            action={
              <LinkButton to="/products/new" icon="add">
                Create Product
              </LinkButton>
            }
          />
        </section>
      ) : (
        <section className="bg-surface-container-low rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                  <th className="px-6 py-4 font-semibold">Title</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold text-right">Base</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Retail
                  </th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Profit
                  </th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-headline">
                {products.map((p) => {
                  const fee = p.retailPrice * 0.05;
                  const profit = p.retailPrice - p.baseCost - fee;
                  const pct =
                    p.retailPrice > 0 ? (profit / p.retailPrice) * 100 : 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-surface-bright transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/products/${p.id}`}
                          className="font-medium text-on-surface hover:text-primary"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {p.providerProduct?.productType ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-right text-on-surface-variant">
                        ${p.baseCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-mono text-right font-bold">
                        ${p.retailPrice.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 font-mono text-right font-bold ${
                          profit >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        ${profit.toFixed(2)}{" "}
                        <span className="text-[10px] opacity-70">
                          ({pct.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ProductPill status={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {p.status === "draft" && (
                            <fetcher.Form method="post">
                              <input
                                type="hidden"
                                name="intent"
                                value="publish"
                              />
                              <input
                                type="hidden"
                                name="productId"
                                value={p.id}
                              />
                              <button className="text-xs font-bold text-primary hover:underline">
                                Publish
                              </button>
                            </fetcher.Form>
                          )}
                          {p.status === "published" && (
                            <fetcher.Form method="post">
                              <input
                                type="hidden"
                                name="intent"
                                value="unpublish"
                              />
                              <input
                                type="hidden"
                                name="productId"
                                value={p.id}
                              />
                              <button className="text-xs font-bold text-amber-400 hover:underline">
                                Unpublish
                              </button>
                            </fetcher.Form>
                          )}
                          <fetcher.Form method="post">
                            <input
                              type="hidden"
                              name="intent"
                              value="delete"
                            />
                            <input
                              type="hidden"
                              name="productId"
                              value={p.id}
                            />
                            <button className="text-xs font-bold text-red-400 hover:underline">
                              Delete
                            </button>
                          </fetcher.Form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-6 flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">
              Showing {products.length} of {pagination.total} — Page{" "}
              {pagination.page} / {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              {pagination.page > 1 && (
                <Button
                  variant="secondary"
                  className="!py-2 !px-4"
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
                  className="!py-2 !px-4"
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
          </div>
        </section>
      )}
    </>
  );
}
