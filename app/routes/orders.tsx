import { useCallback } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type { Order, PaginatedResponse, OrderStatus } from "~/lib/types";
import { ORDER_STATUS_LABELS } from "~/lib/types";
import { PageHeader, EmptyState } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { OrderPill, EscrowPill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Orders",
    description:
      "Track every print-on-demand order across its full lifecycle — from escrow lock to delivery confirmation on the Stellar network.",
    path: "/orders",
    noIndex: true,
  });

const STORE_ID = "demo-store";

const STATUS_FILTERS: (OrderStatus | "")[] = [
  "",
  "PENDING",
  "ESCROW_LOCKED",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "DISPUTED",
];

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = url.searchParams.get("page") || "1";
  const query = url.searchParams.get("q") || "";

  let endpoint = `/orders/${STORE_ID}?page=${page}&limit=20`;
  if (status) endpoint += `&status=${status}`;

  const res = await apiGet<PaginatedResponse<Order>>(endpoint, walletAddress);
  return json({
    orders: res.data?.data ?? [],
    meta: res.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    error: res.error,
    query,
  });
}

export default function Orders() {
  const { orders, meta, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatus = searchParams.get("status") || "";
  const queryValue = searchParams.get("q") || "";

  const handleStatus = useCallback(
    (v: string) => {
      setSearchParams((prev) => {
        if (v) prev.set("status", v);
        else prev.delete("status");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleQuery = useCallback(
    (v: string) => {
      setSearchParams((prev) => {
        if (v) prev.set("q", v);
        else prev.delete("q");
        prev.set("page", "1");
        return prev;
      });
    },
    [setSearchParams],
  );

  const filtered = queryValue
    ? orders.filter(
        (o) =>
          o.customerName.toLowerCase().includes(queryValue.toLowerCase()) ||
          o.shopifyOrderNumber.includes(queryValue),
      )
    : orders;

  return (
    <>
      <PageHeader
        title="Orders & Escrow"
        subtitle="Track every order from escrow to delivery"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filter bar */}
      <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={queryValue}
              onChange={(e) => handleQuery(e.target.value)}
              placeholder="Search by customer name or order number..."
              className="w-full bg-surface-container pl-12 pr-4 py-3 rounded-full text-sm border-0 focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const label = s
              ? ORDER_STATUS_LABELS[s as OrderStatus]
              : "All";
            const active = currentStatus === s;
            return (
              <button
                key={label}
                onClick={() => handleStatus(s)}
                className={
                  active
                    ? "stellar-gradient text-white px-4 py-1.5 rounded-full text-xs font-bold"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl">
          <EmptyState
            icon="shopping_cart"
            title="No orders yet"
            description="Orders placed on your Shopify store will appear here."
          />
        </section>
      ) : (
        <section className="bg-surface-container-low rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold text-center">Items</th>
                  <th className="px-6 py-4 font-semibold text-right">Total</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Escrow</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm font-headline">
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-surface-bright transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/orders/${o.id}`}
                        className="font-mono font-bold text-primary hover:underline"
                      >
                        #{o.shopifyOrderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium">{o.customerName}</td>
                    <td className="px-6 py-4 text-center text-on-surface-variant">
                      {o.items?.length ?? 0}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-right">
                      ${o.totalUsdc.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <OrderPill status={o.status} />
                    </td>
                    <td className="px-6 py-4">
                      {o.escrow ? (
                        <EscrowPill status={o.escrow.status} />
                      ) : (
                        <span className="text-xs text-on-surface-variant/60">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant text-xs">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">
              Showing {filtered.length} of {meta.total} orders — Page {meta.page}{" "}
              / {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              {meta.page > 1 && (
                <Button
                  variant="secondary"
                  className="!py-2"
                  onClick={() =>
                    setSearchParams((prev) => {
                      prev.set("page", String(meta.page - 1));
                      return prev;
                    })
                  }
                >
                  Previous
                </Button>
              )}
              {meta.page < meta.totalPages && (
                <Button
                  variant="secondary"
                  className="!py-2"
                  onClick={() =>
                    setSearchParams((prev) => {
                      prev.set("page", String(meta.page + 1));
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
