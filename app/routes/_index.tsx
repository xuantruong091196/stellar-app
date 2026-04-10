import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { apiGet , deriveStoreId } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type {
  Order,
  Escrow,
  MerchantProduct,
  PaginatedResponse,
} from "~/lib/types";
import { PageHeader, StatCard, SectionCard, EmptyState } from "~/components/ui/PageHeader";
import { LinkButton } from "~/components/ui/Button";
import { EscrowPill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Mission Control",
    description:
      "Real-time overview of your Stellar print-on-demand business — orders, escrow balances, revenue and fulfilment at a glance.",
    path: "/",
    noIndex: true,
  });


export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const [ordersRes, escrowsRes, productsRes] = await Promise.all([
    apiGet<PaginatedResponse<Order>>(`/orders/${deriveStoreId(walletAddress)}?limit=5`, walletAddress),
    apiGet<PaginatedResponse<Escrow>>(`/escrow/store/${deriveStoreId(walletAddress)}?limit=5`, walletAddress),
    apiGet<PaginatedResponse<MerchantProduct>>(
      `/products/store/${deriveStoreId(walletAddress)}?limit=100`,
      walletAddress,
    ),
  ]);

  const orders = ordersRes.data?.data ?? [];
  const escrows = escrowsRes.data?.data ?? [];
  const products = productsRes.data?.data ?? [];

  const orderSummary = {
    pending: orders.filter(
      (o) => o.status === "PENDING" || o.status === "ESCROW_LOCKED",
    ).length,
    inProduction: orders.filter(
      (o) => o.status === "IN_PRODUCTION" || o.status === "SENT_TO_PROVIDER",
    ).length,
    shipped: orders.filter(
      (o) => o.status === "SHIPPED" || o.status === "DELIVERED",
    ).length,
  };

  const totalRevenue = orders
    .filter((o) => o.status === "DELIVERED" || o.status === "ESCROW_RELEASED")
    .reduce((acc, o) => acc + (o.totalUsdc ?? 0), 0);

  const totalOrders = ordersRes.data?.meta?.total ?? orders.length;
  const activeProducts = products.filter((p) => p.status === "published").length;

  return json({
    orders,
    escrows,
    orderSummary,
    totalOrders,
    activeProducts,
    totalRevenue,
    productsCount: products.length,
    error: ordersRes.error || escrowsRes.error || null,
  });
}

export default function Dashboard() {
  const {
    escrows,
    orderSummary,
    totalOrders,
    activeProducts,
    totalRevenue,
    error,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader
        title="Stelo Dashboard"
        subtitle="Your print-on-demand mission control"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="font-bold text-sm">Unable to load some data</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
      )}

      {/* Hero Card */}
      <section className="stellar-gradient h-[200px] rounded-[28px] relative overflow-hidden flex items-center justify-between px-6 md:px-10">
        <div className="absolute inset-0 opacity-20 pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h2 className="text-white/80 text-lg font-headline">
            Good morning, Merchant
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl md:text-5xl font-headline font-extrabold text-white">
              ${totalRevenue.toFixed(2)}
            </span>
            <span className="text-cyan-300 font-mono font-bold">USDC</span>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <code className="font-mono text-white/60 bg-black/20 px-3 py-1 rounded-lg text-sm">
              GDRX...7F9K
            </code>
            <span className="bg-cyan-500/20 text-cyan-200 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-cyan-500/30">
              Stellar Testnet
            </span>
          </div>
        </div>
        <div className="relative z-10 hidden sm:block">
          <LinkButton
            to="/products/new"
            variant="secondary"
            icon="add_circle"
            className="!bg-white !text-on-primary-container !shadow-2xl hover:!scale-105"
          >
            Create Product
          </LinkButton>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="pending_actions"
          iconColor="text-amber-400"
          label="Pending Orders"
          value={orderSummary.pending}
          hint="Live Status"
        />
        <StatCard
          icon="factory"
          iconColor="text-[#6366F1]"
          label="In Production"
          value={orderSummary.inProduction}
          hint="Active"
        />
        <StatCard
          icon="local_shipping"
          iconColor="text-[#5de6ff]"
          label="Shipped / Delivered"
          value={orderSummary.shipped}
          hint="On Track"
        />
        <StatCard
          icon="account_balance"
          iconColor="text-green-400"
          label="Total Revenue"
          value={`$${totalRevenue.toFixed(0)}`}
          hint="Released"
          hintColor="text-green-400"
        />
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 bg-surface-container-low rounded-2xl overflow-hidden">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-bold font-headline">Recent Escrows</h2>
            <LinkButton to="/escrow" variant="ghost" className="!px-4 !py-2">
              View All
            </LinkButton>
          </div>
          <div className="overflow-x-auto">
            {escrows.length === 0 ? (
              <EmptyState
                icon="account_balance_wallet"
                title="No escrows yet"
                description="When orders come in, their escrow state will show up here."
              />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                    <th className="px-6 py-4 font-semibold">Escrow ID</th>
                    <th className="px-6 py-4 font-semibold">Order</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-headline">
                  {escrows.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-surface-bright transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono text-on-surface-variant group-hover:text-on-surface">
                        #{e.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {e.orderId.slice(0, 10)}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-on-surface">
                        {e.amountUsdc.toFixed(2)} USDC
                      </td>
                      <td className="px-6 py-4">
                        <EscrowPill status={e.status} />
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="lg:col-span-4 space-y-8">
          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
              Quick Statistics
            </h3>
            <div className="space-y-6">
              <QuickStat
                label="Total Orders"
                value={totalOrders}
                pct={Math.min(100, totalOrders * 2)}
                bar="bg-primary"
              />
              <QuickStat
                label="Active Products"
                value={activeProducts}
                pct={Math.min(100, activeProducts * 4)}
                bar="bg-secondary"
              />
              <QuickStat
                label="Providers"
                value="—"
                pct={30}
                bar="bg-amber-400"
              />
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
              Recent Activity
            </h3>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/20">
              {escrows.slice(0, 4).map((e) => (
                <div key={e.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary" />
                  <p className="text-xs text-on-surface-variant">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-medium">
                    Escrow{" "}
                    <span className="text-primary">#{e.id.slice(0, 6)}</span>{" "}
                    — {e.status.toLowerCase()}
                  </p>
                </div>
              ))}
              {escrows.length === 0 && (
                <p className="text-sm text-on-surface-variant pl-8">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function QuickStat({
  label,
  value,
  pct,
  bar,
}: {
  label: string;
  value: string | number;
  pct: number;
  bar: string;
}) {
  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-mono font-bold">{value}</span>
      </div>
      <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
        <div className={`${bar} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}
