import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { apiGet, apiPost , deriveStoreId } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import type { Escrow, PaginatedResponse, EscrowStatus } from "~/lib/types";
import { PageHeader, StatCard, EmptyState } from "~/components/ui/PageHeader";
import { EscrowPill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Escrow Dashboard",
    description:
      "Track USDC escrow balances across every order. Funds held on the Stellar network until fulfilment is confirmed — no chargebacks.",
    path: "/escrow",
    noIndex: true,
  });


export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const result = await apiGet<PaginatedResponse<Escrow>>(
    `/escrow/store/${deriveStoreId(walletAddress)}?page=${page}&limit=20`,
    walletAddress,
  );

  if (result.error || !result.data) {
    return json({
      escrows: [] as Escrow[],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      summary: {
        totalLocked: 0,
        totalReleased: 0,
        totalDisputed: 0,
        activeCount: 0,
      },
      error: result.error || "Failed to load escrows",
    });
  }

  const all = result.data.data;
  const summary = all.reduce(
    (acc, e) => {
      if (e.status === "LOCKED" || e.status === "LOCKING") {
        acc.totalLocked += e.amountUsdc;
        acc.activeCount += 1;
      }
      if (e.status === "RELEASED" || e.status === "RELEASING")
        acc.totalReleased += e.amountUsdc;
      if (e.status === "DISPUTED") {
        acc.totalDisputed += e.amountUsdc;
        acc.activeCount += 1;
      }
      return acc;
    },
    { totalLocked: 0, totalReleased: 0, totalDisputed: 0, activeCount: 0 },
  );

  return json({
    escrows: all,
    meta: result.data.meta,
    summary,
    error: null as string | null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  if (intent === "release") {
    const escrowId = formData.get("escrowId") as string;
    if (!escrowId)
      return json(
        { success: false, error: "Missing escrow ID" },
        { status: 400 },
      );
    const r = await apiPost(`/escrow/${escrowId}/release`, {}, walletAddress);
    return r.error
      ? json(
          { success: false, error: r.error },
          { status: r.status || 500 },
        )
      : json({ success: true, error: null });
  }
  return json(
    { success: false, error: "Unknown intent" },
    { status: 400 },
  );
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EscrowDashboard() {
  const { escrows, summary, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean; error: string | null }>();

  const activeStatuses: EscrowStatus[] = ["LOCKED", "LOCKING", "DISPUTED"];
  const historyStatuses: EscrowStatus[] = [
    "RELEASED",
    "RELEASING",
    "REFUNDED",
    "EXPIRED",
  ];

  const active = escrows.filter((e) =>
    activeStatuses.includes(e.status as EscrowStatus),
  );
  const history = escrows.filter((e) =>
    historyStatuses.includes(e.status as EscrowStatus),
  );

  const releaseInFlight = fetcher.state !== "idle";

  return (
    <>
      <PageHeader
        title="Escrow Dashboard"
        subtitle="Stellar-powered escrow for every order"
      />

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm">{error}</p>
        </div>
      )}
      {fetcher.data && !fetcher.data.success && fetcher.data.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Release failed</p>
          <p className="text-xs opacity-80">{fetcher.data.error}</p>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="lock"
          iconColor="text-amber-400"
          label="Total Locked"
          value={`$${summary.totalLocked.toFixed(2)}`}
          hint="Awaiting"
        />
        <StatCard
          icon="check_circle"
          iconColor="text-green-400"
          label="Total Released"
          value={`$${summary.totalReleased.toFixed(2)}`}
          hint="Settled"
          hintColor="text-green-400"
        />
        <StatCard
          icon="warning"
          iconColor="text-red-400"
          label="Disputed"
          value={`$${summary.totalDisputed.toFixed(2)}`}
          hint="Attention"
          hintColor="text-red-400"
        />
        <StatCard
          icon="bolt"
          iconColor="text-[#6366F1]"
          label="Active Escrows"
          value={summary.activeCount}
          hint="Live"
        />
      </section>

      {/* Active */}
      <section className="bg-surface-container-low rounded-2xl overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold font-headline">Active Escrows</h2>
          <span className="text-xs text-on-surface-variant font-mono">
            {active.length} active
          </span>
        </div>
        {active.length === 0 ? (
          <EmptyState
            icon="account_balance_wallet"
            title="No active escrows"
            description="New orders will create escrow contracts automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                  <th className="px-6 py-4 font-semibold">Escrow ID</th>
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Provider</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Amount
                  </th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Locked</th>
                  <th className="px-6 py-4 font-semibold">Expires</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm font-headline">
                {active.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-surface-bright transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-on-surface-variant">
                      #{e.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4">
                      {e.orderId ? (
                        <Link
                          to={`/orders/${e.orderId}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {e.orderId.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                      {e.providerId?.slice(0, 8) || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-right">
                      ${e.amountUsdc.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <EscrowPill status={e.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">
                      {formatDate(e.lockedAt)}
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">
                      {formatDate(e.expiresAt)}
                    </td>
                    <td className="px-6 py-4">
                      {e.status === "LOCKED" && (
                        <fetcher.Form method="post">
                          <input
                            type="hidden"
                            name="intent"
                            value="release"
                          />
                          <input
                            type="hidden"
                            name="escrowId"
                            value={e.id}
                          />
                          <button
                            type="submit"
                            disabled={releaseInFlight}
                            className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                          >
                            Release
                          </button>
                        </fetcher.Form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* History */}
      <section className="bg-surface-container-low rounded-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold font-headline">Release History</h2>
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon="history"
            title="No history yet"
            description="Released and refunded escrows will show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant text-[10px] uppercase tracking-[0.1em]">
                  <th className="px-6 py-4 font-semibold">Escrow ID</th>
                  <th className="px-6 py-4 font-semibold">Order</th>
                  <th className="px-6 py-4 font-semibold">Provider</th>
                  <th className="px-6 py-4 font-semibold text-right">
                    Amount
                  </th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Released</th>
                </tr>
              </thead>
              <tbody className="text-sm font-headline">
                {history.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-surface-bright transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-on-surface-variant">
                      #{e.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {e.orderId?.slice(0, 8) || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                      {e.providerId?.slice(0, 8) || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-right">
                      ${e.amountUsdc.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <EscrowPill status={e.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">
                      {formatDate(e.releasedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
