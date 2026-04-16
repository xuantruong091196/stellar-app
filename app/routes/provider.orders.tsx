import { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData, useRevalidator } from "@remix-run/react";
import { api } from "~/lib/api";
import { pageMeta } from "~/lib/seo";

interface ProviderOrder {
  id: string;
  orderId: string;
  status: string;
  totalBaseCost: number;
  platformFee: number;
  designFileUrls: string[];
  externalOrderId: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    shopifyOrderNumber: string;
    customerName: string;
    totalUsdc: number;
  };
}

interface OrdersResponse {
  data: ProviderOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "printing", label: "Printing" },
  { key: "quality_check", label: "QC" },
  { key: "packing", label: "Packing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-300 border border-amber-400/20",
  accepted: "bg-blue-400/15 text-blue-300 border border-blue-400/20",
  printing: "bg-violet-400/15 text-violet-300 border border-violet-400/20",
  quality_check: "bg-cyan-400/15 text-cyan-300 border border-cyan-400/20",
  packing: "bg-indigo-400/15 text-indigo-300 border border-indigo-400/20",
  shipped: "bg-emerald-400/15 text-emerald-300 border border-emerald-400/20",
  delivered: "bg-green-400/15 text-green-300 border border-green-400/20",
};

function decodeToken(token: string): { sub: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Order Queue",
    description: "Manage your incoming print orders.",
    path: "/provider/orders",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/provider_token=([^;]+)/);
  const token = tokenMatch?.[1];
  const url = new URL(request.url);
  const nextParam = encodeURIComponent(url.pathname + url.search);
  if (!token) return redirect(`/provider-login?next=${nextParam}`);

  const payload = decodeToken(token);
  const providerId = payload?.sub;
  if (!providerId) return redirect(`/provider-login?next=${nextParam}`);

  const status = url.searchParams.get("status") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const qs = new URLSearchParams({ limit: "20", page: String(page) });
  if (status) qs.set("status", status);

  const result = await api<OrdersResponse>(
    `/provider-orders/${providerId}?${qs}`,
    { token },
  );

  return json({
    token,
    providerId,
    orders: result.data?.data ?? [],
    meta: result.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 },
    activeStatus: status,
    page,
  });
}

export default function ProviderOrders() {
  const { token, providerId, orders, meta: pageMeta, activeStatus, page } =
    useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const esRef = useRef<EventSource | null>(null);
  const [hasNewOrder, setHasNewOrder] = useState(false);

  // SSE: listen for real-time order updates
  useEffect(() => {
    const apiBase =
      typeof window !== "undefined"
        ? (window as any).ENV?.PUBLIC_API_URL || ""
        : "";

    const url = `${apiBase}/provider-orders/${providerId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("new_order", () => {
      setHasNewOrder(true);
    });
    es.addEventListener("status_changed", () => {
      revalidate();
    });
    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [providerId, revalidate]);

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Order Queue</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {pageMeta.total} total orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasNewOrder && (
            <button
              onClick={() => { setHasNewOrder(false); revalidate(); }}
              className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              New order arrived — refresh
            </button>
          )}
          {pendingCount > 0 && (
            <span className="bg-amber-400/20 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-400/20">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.key}
            to={`/provider/orders${tab.key ? `?status=${tab.key}` : ""}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              activeStatus === tab.key
                ? "stellar-gradient text-white"
                : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="bg-surface-container-low rounded-2xl p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
            inbox
          </span>
          <p className="text-on-surface-variant">
            {activeStatus
              ? `No ${activeStatus} orders`
              : "No orders yet — they'll appear here when merchants place orders"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageMeta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link
              to={`/provider/orders?${activeStatus ? `status=${activeStatus}&` : ""}page=${page - 1}`}
              className="px-4 py-2 bg-surface-container rounded-lg text-sm hover:bg-surface-container-high transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-on-surface-variant">
            Page {page} of {pageMeta.totalPages}
          </span>
          {page < pageMeta.totalPages && (
            <Link
              to={`/provider/orders?${activeStatus ? `status=${activeStatus}&` : ""}page=${page + 1}`}
              className="px-4 py-2 bg-surface-container rounded-lg text-sm hover:bg-surface-container-high transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: ProviderOrder }) {
  const statusClass = STATUS_COLORS[order.status] || "bg-surface-container text-on-surface-variant";
  const payout = order.totalBaseCost - order.platformFee;

  return (
    <Link
      to={`/provider/orders/${order.id}`}
      className="block bg-surface-container-low rounded-2xl p-5 hover:bg-surface-container transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold font-mono text-sm">
              #{order.order.shopifyOrderNumber}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusClass}`}>
              {order.status.replace("_", " ")}
            </span>
            {order.externalOrderId && (
              <span className="text-[10px] text-on-surface-variant font-mono">
                ext: {order.externalOrderId}
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant truncate">
            {order.order.customerName}
          </p>
          <p className="text-xs text-on-surface-variant/60">
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="text-right flex-shrink-0 space-y-1">
          <p className="font-bold text-sm">
            ${payout.toFixed(2)}{" "}
            <span className="text-xs font-normal text-on-surface-variant">USDC</span>
          </p>
          {order.trackingNumber && (
            <p className="text-[10px] text-emerald-400 font-mono">{order.trackingNumber}</p>
          )}
          <span className="material-symbols-outlined text-on-surface-variant/40 text-lg">
            chevron_right
          </span>
        </div>
      </div>
    </Link>
  );
}
