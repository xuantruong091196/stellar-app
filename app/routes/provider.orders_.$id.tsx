import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
import { api } from "~/lib/api";
import { Button } from "~/components/ui/Button";
import { pageMeta } from "~/lib/seo";

interface ProviderOrder {
  id: string;
  orderId: string;
  providerId: string;
  status: string;
  totalBaseCost: number;
  platformFee: number;
  designFileUrls: string[];
  externalOrderId: string | null;
  externalOrderUrl: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  trackingCompany: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    shopifyOrderNumber: string;
    customerName: string;
    shippingAddress: Record<string, string>;
    totalUsdc: number;
    items: Array<{
      productType: string;
      variant: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
}

const STATUS_FLOW = [
  "pending",
  "accepted",
  "printing",
  "quality_check",
  "packing",
  "shipped",
  "delivered",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  printing: "Printing",
  quality_check: "Quality Check",
  packing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
};

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
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function extractToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  return cookie.match(/provider_token=([^;]+)/)?.[1] ?? null;
}

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  pageMeta({
    title: data ? `Order #${data.order.order.shopifyOrderNumber}` : "Order Detail",
    description: "Print order details and status management.",
    path: "/provider/orders",
    noIndex: true,
  });

export async function loader({ request, params }: LoaderFunctionArgs) {
  const token = extractToken(request);
  const url = new URL(request.url);
  const nextParam = encodeURIComponent(url.pathname + url.search);
  if (!token) return redirect(`/provider-login?next=${nextParam}`);

  const payload = decodeToken(token);
  if (!payload?.sub) return redirect(`/provider-login?next=${nextParam}`);

  const result = await api<ProviderOrder>(`/provider-orders/detail/${params.id}`, { token });
  const orderData = result.data;
  if (!orderData) throw new Response("Order not found", { status: 404 });

  // Ownership check — provider can only see their own orders
  if (orderData.providerId !== payload.sub) {
    throw new Response("Forbidden", { status: 403 });
  }

  return json({ token, providerId: payload.sub, order: orderData });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const token = extractToken(request);
  if (!token) return redirect("/provider-login");

  const form = await request.formData();
  const intent = form.get("intent") as string;

  if (intent === "update-status") {
    const status = form.get("status") as string;
    const result = await api(`/provider-orders/${params.id}/status`, {
      method: "PATCH",
      body: { status },
      token,
    });
    if (result.error) return json({ error: result.error }, { status: 500 });
    return json({ success: true, intent });
  }

  if (intent === "submit-tracking") {
    const trackingNumber = form.get("trackingNumber") as string;
    const trackingUrl = (form.get("trackingUrl") as string) || undefined;
    const company = (form.get("company") as string) || undefined;

    if (!trackingNumber?.trim()) {
      return json({ error: "Tracking number is required" }, { status: 400 });
    }

    const result = await api(`/provider-orders/${params.id}/tracking`, {
      method: "POST",
      body: { trackingNumber, trackingUrl, company },
      token,
    });
    if (result.error) return json({ error: result.error }, { status: 500 });
    return json({ success: true, intent });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
}

export default function ProviderOrderDetail() {
  const { order, providerId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  const [showTracking, setShowTracking] = useState(false);

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIdx + 1] ?? null;
  const payout = order.totalBaseCost - order.platformFee;
  const isSubmitting = fetcher.state !== "idle";

  const sa = order.order.shippingAddress;
  const addressLine = [sa?.address1, sa?.address2].filter(Boolean).join(", ");
  const cityLine = [sa?.city, sa?.province_code || sa?.province, sa?.zip].filter(Boolean).join(" ");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        to="/provider/orders"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Order Queue
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline">
            Order #{order.order.shopifyOrderNumber}
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status] || ""}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {/* Action feedback */}
      {actionData && "error" in actionData && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-xl text-sm">
          {actionData.error}
        </div>
      )}
      {actionData && "success" in actionData && (
        <div className="bg-green-500/10 border border-green-400/20 text-green-300 px-4 py-3 rounded-xl text-sm">
          {actionData.intent === "submit-tracking"
            ? "Tracking submitted and Shopify fulfillment triggered."
            : "Status updated successfully."}
        </div>
      )}

      {/* Status progress stepper */}
      <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          Progress
        </h2>
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {STATUS_FLOW.map((s, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s} className="flex items-center flex-shrink-0">
                <div className={`flex flex-col items-center gap-1 ${active ? "" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    done
                      ? "stellar-gradient text-white border-transparent"
                      : "bg-surface-container text-on-surface-variant border-surface-container-high"
                  }`}>
                    {done && !active
                      ? <span className="material-symbols-outlined text-sm">check</span>
                      : i + 1}
                  </div>
                  <span className={`text-[9px] uppercase tracking-wide ${active ? "text-primary font-bold" : "text-on-surface-variant/60"}`}>
                    {STATUS_LABELS[s]?.replace(" ", "\n")}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`h-0.5 w-6 mx-0.5 flex-shrink-0 ${i < currentIdx ? "bg-primary" : "bg-surface-container-high"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Next status action */}
        {nextStatus && order.status !== "delivered" && (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="update-status" />
            <input type="hidden" name="status" value={nextStatus} />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? "Updating..." : `Mark as ${STATUS_LABELS[nextStatus]}`}
            </Button>
          </fetcher.Form>
        )}
      </div>

      {/* Design files */}
      {order.designFileUrls.length > 0 && (
        <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            Print Files
          </h2>
          <div className="space-y-2">
            {order.designFileUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-3 hover:bg-surface-container-high transition-colors group"
              >
                <span className="material-symbols-outlined text-primary">download</span>
                <span className="text-sm flex-1 truncate font-mono">{url.split("/").pop()}</span>
                <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-on-surface-variant text-sm transition-colors">
                  open_in_new
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tracking */}
      {order.status === "shipped" || order.trackingNumber ? (
        <div className="bg-surface-container-low rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
            Tracking
          </h2>
          {order.trackingNumber ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-sm">local_shipping</span>
                <span className="font-mono text-sm">{order.trackingNumber}</span>
                {order.trackingCompany && (
                  <span className="text-xs text-on-surface-variant">via {order.trackingCompany}</span>
                )}
              </div>
              {(() => {
                // Defense in depth: never render a tracking link unless it's
                // a well-formed http(s) URL. Blocks `javascript:` / `data:` URI
                // injection that would bypass the backend DTO check.
                const url = order.trackingUrl?.trim() ?? "";
                const safe = /^https?:\/\//i.test(url) ? url : null;
                return safe ? (
                  <a
                    href={safe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Track shipment →
                  </a>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">No tracking submitted yet.</p>
          )}
        </div>
      ) : null}

      {/* Submit tracking form */}
      {["printing", "quality_check", "packing", "accepted"].includes(order.status) && (
        <div className="bg-surface-container-low rounded-2xl p-5 space-y-4">
          <button
            onClick={() => setShowTracking((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors w-full"
          >
            <span className="material-symbols-outlined text-sm">
              {showTracking ? "expand_less" : "expand_more"}
            </span>
            {order.trackingNumber ? "Update Tracking" : "Submit Tracking & Ship"}
          </button>

          {showTracking && (
            <fetcher.Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="submit-tracking" />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Tracking Number *
                </label>
                <input
                  name="trackingNumber"
                  required
                  defaultValue={order.trackingNumber ?? ""}
                  placeholder="1Z999AA10123456784"
                  className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Carrier
                  </label>
                  <input
                    name="company"
                    defaultValue={order.trackingCompany ?? ""}
                    placeholder="UPS, FedEx, USPS…"
                    className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Tracking URL
                  </label>
                  <input
                    name="trackingUrl"
                    type="url"
                    defaultValue={order.trackingUrl ?? ""}
                    placeholder="https://…"
                    className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-on-surface-variant">
                Submitting tracking will mark this order as <strong>Shipped</strong> and trigger Shopify fulfillment.
              </p>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting…" : "Submit Tracking"}
              </Button>
            </fetcher.Form>
          )}
        </div>
      )}

      {/* Order info */}
      <div className="bg-surface-container-low rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
          Order Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-on-surface-variant text-xs mb-0.5">Customer</p>
            <p className="font-medium">{order.order.customerName}</p>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs mb-0.5">Payout</p>
            <p className="font-bold text-emerald-400">${payout.toFixed(2)} USDC</p>
          </div>
          {addressLine && (
            <div className="col-span-2">
              <p className="text-on-surface-variant text-xs mb-0.5">Ship To</p>
              <p>{sa?.name}</p>
              <p className="text-on-surface-variant">{addressLine}</p>
              <p className="text-on-surface-variant">{cityLine}</p>
              <p className="text-on-surface-variant">{sa?.country_code}</p>
            </div>
          )}
        </div>

        {/* Line items */}
        {order.order.items.length > 0 && (
          <div className="space-y-2 border-t border-surface-container-high pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Items</p>
            {order.order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{item.productType} — {item.variant}</span>
                <span className="text-on-surface-variant">×{item.quantity}</span>
              </div>
            ))}
          </div>
        )}

        {/* External order link */}
        {order.externalOrderUrl && (
          <a
            href={order.externalOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            View in provider dashboard
          </a>
        )}
      </div>
    </div>
  );
}
