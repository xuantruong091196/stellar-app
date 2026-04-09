import { useState } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { apiGet, apiPost } from "~/lib/api";
import type { Order, EscrowStatus, ProviderOrder } from "~/lib/types";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { OrderPill, EscrowPill, Pill } from "~/components/ui/StatusPill";

export const meta: MetaFunction = () => [
  { title: "StellarPOD — Order Detail" },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const { orderId } = params;
  if (!orderId) throw new Response("Order ID is required", { status: 400 });
  const res = await apiGet<Order>(`/orders/detail/${orderId}`);
  if (res.error) throw new Response(res.error, { status: res.status || 500 });
  const order = res.data!;
  const providerOrders: ProviderOrder[] =
    (order as Order & { providerOrders?: ProviderOrder[] }).providerOrders ?? [];
  return json({ order, providerOrders });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const { orderId } = params;
  if (!orderId) return json({ error: "Order ID is required" }, { status: 400 });

  switch (intent) {
    case "release": {
      const escrowId = formData.get("escrowId") as string;
      if (!escrowId)
        return json({ error: "Escrow ID is required" }, { status: 400 });
      const res = await apiPost(`/escrow/${escrowId}/release`, {});
      return res.error
        ? json({ error: res.error }, { status: res.status || 500 })
        : json({ success: true, message: "Escrow funds released successfully" });
    }
    case "dispute": {
      const escrowId = formData.get("escrowId") as string;
      const reason = formData.get("reason") as string;
      if (!escrowId)
        return json({ error: "Escrow ID is required" }, { status: 400 });
      const res = await apiPost(`/escrow/${escrowId}/dispute`, {
        raisedBy: "merchant",
        reason: reason || "Dispute raised by merchant",
      });
      return res.error
        ? json({ error: res.error }, { status: res.status || 500 })
        : json({ success: true, message: "Dispute opened successfully" });
    }
    case "cancel": {
      const res = await apiPost(`/orders/${orderId}/cancel`, {});
      return res.error
        ? json({ error: res.error }, { status: res.status || 500 })
        : json({ success: true, message: "Order cancelled successfully" });
    }
    default:
      return json({ error: `Unknown intent: ${intent}` }, { status: 400 });
  }
}

const ESCROW_TIMELINE: { key: EscrowStatus; label: string; tone: string }[] = [
  { key: "LOCKED", label: "Locked", tone: "amber" },
  { key: "RELEASING", label: "In Production", tone: "indigo" },
  { key: "RELEASED", label: "Released", tone: "green" },
];

export default function OrderDetail() {
  const { order, providerOrders } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{
    error?: string;
    success?: boolean;
    message?: string;
  }>();

  const [showRelease, setShowRelease] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const isSubmitting = fetcher.state !== "idle";
  const shippingAddress = order.shippingAddress as Record<string, string> | null;

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <Link
          to="/orders"
          className="text-on-surface-variant hover:text-primary flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Orders
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-on-surface-variant">
          #{order.shopifyOrderNumber}
        </span>
      </div>

      <PageHeader
        title={`Order #${order.shopifyOrderNumber}`}
        subtitle={`Created ${new Date(order.createdAt).toLocaleDateString()} • ${order.customerName}`}
        actions={<OrderPill status={order.status} />}
      />

      {fetcher.data?.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Action failed</p>
          <p className="text-xs opacity-80">{fetcher.data.error}</p>
        </div>
      )}
      {fetcher.data?.success && (
        <div className="bg-green-400/10 border border-green-400/20 text-green-200 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">{fetcher.data.message}</p>
        </div>
      )}

      {/* Escrow Timeline */}
      {order.escrow && (
        <section className="bg-surface-container-low rounded-2xl p-8">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-8">
            Escrow Timeline
          </h3>
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-1 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="stellar-gradient h-full transition-all duration-500"
                style={{
                  width:
                    order.escrow.status === "RELEASED"
                      ? "100%"
                      : order.escrow.status === "RELEASING"
                        ? "66%"
                        : "33%",
                }}
              />
            </div>
            <div className="relative flex justify-between">
              {ESCROW_TIMELINE.map((s) => {
                const reached =
                  (s.key === "LOCKED" &&
                    ["LOCKED", "RELEASING", "RELEASED"].includes(order.escrow!.status)) ||
                  (s.key === "RELEASING" &&
                    ["RELEASING", "RELEASED"].includes(order.escrow!.status)) ||
                  (s.key === "RELEASED" && order.escrow!.status === "RELEASED");
                return (
                  <div key={s.key} className="flex flex-col items-center">
                    <div
                      className={
                        reached
                          ? "w-10 h-10 rounded-full stellar-gradient flex items-center justify-center text-white font-bold shadow-lg"
                          : "w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant"
                      }
                    >
                      {reached ? (
                        <span className="material-symbols-outlined text-base">
                          check
                        </span>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    <p className="text-xs font-bold mt-2">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {showRelease && order.escrow && (
        <div className="bg-amber-400/10 border border-amber-400/20 px-6 py-5 rounded-2xl space-y-3">
          <p className="font-bold text-amber-200">Confirm Escrow Release</p>
          <p className="text-sm text-amber-100/80">
            This will release ${order.escrow.amountUsdc.toFixed(2)} USDC to the
            print provider. This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="release" />
              <input type="hidden" name="escrowId" value={order.escrow.id} />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Releasing..." : "Confirm Release"}
              </Button>
            </fetcher.Form>
            <Button variant="secondary" onClick={() => setShowRelease(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showDispute && order.escrow && (
        <div className="bg-red-500/10 border border-red-400/20 px-6 py-5 rounded-2xl space-y-3">
          <p className="font-bold text-red-300">Open Dispute</p>
          <p className="text-sm text-red-200/80">
            This will flag the escrow for review. Funds remain locked until
            resolved.
          </p>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={3}
            placeholder="Describe the issue..."
            className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex items-center gap-2">
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="dispute" />
              <input type="hidden" name="escrowId" value={order.escrow.id} />
              <input type="hidden" name="reason" value={disputeReason} />
              <Button type="submit" variant="danger" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Confirm Dispute"}
              </Button>
            </fetcher.Form>
            <Button variant="secondary" onClick={() => setShowDispute(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="bg-red-500/10 border border-red-400/20 px-6 py-5 rounded-2xl space-y-3">
          <p className="font-bold text-red-300">Cancel Order</p>
          <p className="text-sm text-red-200/80">
            Are you sure? This may trigger a refund.
          </p>
          <div className="flex items-center gap-2">
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="cancel" />
              <Button type="submit" variant="danger" disabled={isSubmitting}>
                {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </fetcher.Form>
            <Button variant="secondary" onClick={() => setShowCancel(false)}>
              Keep Order
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-8 space-y-8">
          {/* Order Items */}
          <section className="bg-surface-container-low rounded-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold font-headline">Order Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-6 py-3 font-semibold font-mono">ID</th>
                    <th className="px-6 py-3 font-semibold text-center">Qty</th>
                    <th className="px-6 py-3 font-semibold text-right">Unit</th>
                  </tr>
                </thead>
                <tbody className="font-headline text-sm">
                  {(order.items ?? []).map((i) => (
                    <tr
                      key={i.id}
                      className="hover:bg-surface-bright transition-colors"
                    >
                      <td className="px-6 py-3 font-medium">
                        {i.productType} — {i.variant}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-on-surface-variant">
                        {i.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-3 text-center">{i.quantity}</td>
                      <td className="px-6 py-3 font-mono text-right">
                        ${i.unitPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 space-y-2 text-sm">
              <Row
                label="Subtotal"
                value={`$${order.subtotalUsdc.toFixed(2)}`}
              />
              <Row
                label="Platform Fee"
                value={`$${order.platformFeeUsdc.toFixed(2)}`}
              />
              <Row
                label="Provider Pay"
                value={`$${order.providerPayUsdc.toFixed(2)}`}
              />
              <div className="h-[1px] bg-outline-variant/20 my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold">Total</span>
                <span className="font-mono font-bold text-lg">
                  ${order.totalUsdc.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          {/* Shipping */}
          <section className="bg-surface-container-low rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold font-headline">Shipping</h2>
            <div className="space-y-2 text-sm">
              <Row
                label="Tracking"
                value={order.trackingNumber || "Not yet available"}
              />
              {order.trackingUrl && (
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Track URL</span>
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    Track Package
                    <span className="material-symbols-outlined text-sm">
                      open_in_new
                    </span>
                  </a>
                </div>
              )}
              <Row
                label="Shipped At"
                value={
                  order.shippedAt
                    ? new Date(order.shippedAt).toLocaleDateString()
                    : "—"
                }
              />
              <Row
                label="Delivered At"
                value={
                  order.deliveredAt
                    ? new Date(order.deliveredAt).toLocaleDateString()
                    : "—"
                }
              />
            </div>
          </section>

          {/* Provider Orders */}
          {providerOrders.length > 0 && (
            <section className="bg-surface-container-low rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold font-headline">
                Provider Orders
              </h2>
              {providerOrders.map((po) => (
                <div
                  key={po.id}
                  className="bg-surface-container p-5 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">
                      {po.provider?.name ||
                        `Provider ${po.providerId.slice(0, 8)}`}
                    </h3>
                    <Pill tone="indigo">{po.status}</Pill>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Row
                      label="Base Cost"
                      value={`$${po.totalBaseCost.toFixed(2)}`}
                    />
                    <Row
                      label="Platform Fee"
                      value={`$${po.platformFee.toFixed(2)}`}
                    />
                    <Row
                      label="Tracking"
                      value={po.trackingNumber || "—"}
                    />
                    <Row
                      label="Shipped"
                      value={
                        po.shippedAt
                          ? new Date(po.shippedAt).toLocaleDateString()
                          : "—"
                      }
                    />
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-4 space-y-8">
          {/* Escrow Card */}
          {order.escrow ? (
            <div className="bg-surface-container-low p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Escrow
                </h3>
                <EscrowPill status={order.escrow.status} />
              </div>
              <div className="text-center py-4">
                <p className="font-mono text-4xl font-bold stellar-text-gradient">
                  ${order.escrow.amountUsdc.toFixed(2)}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  USDC Locked
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <Row
                  label="Platform Fee"
                  value={`$${order.escrow.platformFee.toFixed(2)}`}
                />
                <Row
                  label="Provider Amt"
                  value={`$${order.escrow.providerAmount.toFixed(2)}`}
                />
                {order.escrow.lockedAt && (
                  <Row
                    label="Locked"
                    value={new Date(
                      order.escrow.lockedAt,
                    ).toLocaleDateString()}
                  />
                )}
                {order.escrow.lockTxHash && (
                  <Row
                    label="Lock TX"
                    value={`${order.escrow.lockTxHash.slice(0, 10)}…`}
                    mono
                  />
                )}
                {order.escrow.releaseTxHash && (
                  <Row
                    label="Release TX"
                    value={`${order.escrow.releaseTxHash.slice(0, 10)}…`}
                    mono
                  />
                )}
                <Row
                  label="Expires"
                  value={new Date(
                    order.escrow.expiresAt,
                  ).toLocaleDateString()}
                />
              </div>
              <div className="space-y-2 pt-2">
                {order.escrow.status === "LOCKED" && (
                  <Button
                    className="w-full"
                    onClick={() => setShowRelease(true)}
                  >
                    Release Funds
                  </Button>
                )}
                {(order.escrow.status === "LOCKED" ||
                  order.escrow.status === "LOCKING") && (
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => setShowDispute(true)}
                  >
                    Open Dispute
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low p-6 rounded-2xl">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Escrow
              </h3>
              <p className="text-sm text-on-surface-variant">
                No escrow record for this order.
              </p>
            </div>
          )}

          {/* Customer */}
          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Customer
            </h3>
            <p className="font-bold">{order.customerName}</p>
            {shippingAddress && (
              <p className="text-sm text-on-surface-variant mt-2">
                {[
                  shippingAddress.address1,
                  shippingAddress.city,
                  shippingAddress.province,
                  shippingAddress.zip,
                  shippingAddress.country,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          {/* Actions */}
          {order.status === "PENDING" && (
            <div className="bg-surface-container-low p-6 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                Actions
              </h3>
              <Button
                variant="danger"
                className="w-full"
                onClick={() => setShowCancel(true)}
              >
                Cancel Order
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-on-surface-variant">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-mono"}>{value}</span>
    </div>
  );
}
