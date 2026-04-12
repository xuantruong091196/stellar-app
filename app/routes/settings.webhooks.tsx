import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams, Link } from "@remix-run/react";
import { apiGet, apiPost } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { Pill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

interface Delivery {
  id: string;
  requestId: string;
  url: string;
  eventType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
}

interface DeliveriesResponse {
  data: Delivery[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const STATUS_TONES: Record<string, "indigo" | "cyan" | "amber" | "green" | "red"> = {
  pending: "amber",
  retrying: "amber",
  success: "green",
  failed: "red",
};

const STATUSES = ["", "pending", "retrying", "success", "failed"];

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Webhook Deliveries",
    description: "Audit log of outbound webhook deliveries with retry and redrive options.",
    path: "/settings/webhooks",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = url.searchParams.get("page") || "1";

  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", "20");
  if (status) params.set("status", status);

  const res = await apiGet<DeliveriesResponse>(
    `/webhooks/outbound/deliveries?${params.toString()}`,
    walletAddress,
  );

  return json({
    walletAddress,
    deliveries: res.data?.data || [],
    meta: res.data?.meta || null,
    error: res.error,
    currentStatus: status,
    currentPage: parseInt(page, 10),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const formData = await request.formData();
  const id = formData.get("id") as string;
  if (!id) return json({ error: "Missing id" }, { status: 400 });

  const res = await apiPost(
    `/webhooks/outbound/deliveries/${id}/redrive`,
    {},
    walletAddress,
  );

  return res.error
    ? json({ success: false, error: res.error })
    : json({ success: true, error: null });
}

export default function WebhookDeliveriesPage() {
  const { deliveries, meta, currentStatus, currentPage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  };

  const redrive = (id: string) => {
    fetcher.submit({ id }, { method: "post" });
  };

  return (
    <>
      <div className="flex items-center gap-3 text-sm">
        <Link to="/settings" className="text-on-surface-variant hover:text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Settings
        </Link>
        <span className="text-on-surface-variant/40">/</span>
        <span className="text-on-surface-variant">Webhook Deliveries</span>
      </div>

      <PageHeader
        title="Webhook Delivery Log"
        subtitle={meta ? `${meta.total} total deliveries` : "Audit log of outbound webhook attempts"}
      />

      {/* Status filter */}
      <section className="bg-surface-container-low rounded-2xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-2">
            Status:
          </span>
          {STATUSES.map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setParam("status", s)}
              className={
                currentStatus === s
                  ? "stellar-gradient text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors"
              }
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </section>

      {/* Deliveries */}
      {deliveries.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">webhook</span>
          <p className="text-sm text-on-surface-variant mt-4">No deliveries yet</p>
          <p className="text-xs text-on-surface-variant/60 mt-2">
            Configure your webhook URL in <Link to="/settings" className="text-primary hover:underline">settings</Link> first
          </p>
        </section>
      ) : (
        <section className="bg-surface-container-low rounded-2xl divide-y divide-outline-variant/10">
          {deliveries.map((d) => (
            <div key={d.id} className="px-6 py-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <Pill tone={STATUS_TONES[d.status] || "indigo"}>{d.status}</Pill>
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      {d.eventType}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-on-surface-variant/80 mt-2 truncate">
                    POST {d.url}
                  </p>
                  <p className="font-mono text-[10px] text-on-surface-variant/60 mt-1">
                    Request ID: {d.requestId}
                  </p>
                </div>
                <div className="text-right text-xs text-on-surface-variant/80">
                  <p>
                    {new Date(d.createdAt).toLocaleDateString()}{" "}
                    {new Date(d.createdAt).toLocaleTimeString()}
                  </p>
                  <p className="mt-1">
                    Attempts: {d.attempts}/{d.maxAttempts}
                  </p>
                </div>
              </div>

              {d.responseStatus && (
                <div className="text-xs">
                  <span className="text-on-surface-variant">Response: </span>
                  <span
                    className={`font-mono font-bold ${
                      d.responseStatus < 400 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    HTTP {d.responseStatus}
                  </span>
                  {d.responseBody && (
                    <pre className="mt-2 p-3 bg-surface-container rounded-lg text-[10px] font-mono text-on-surface-variant/80 overflow-x-auto">
                      {d.responseBody}
                    </pre>
                  )}
                </div>
              )}

              {d.errorMessage && (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 px-3 py-2 rounded-lg font-mono">
                  {d.errorMessage}
                </div>
              )}

              {(d.status === "failed" || d.status === "retrying") && (
                <div className="flex justify-end">
                  <Button variant="secondary" className="!py-2 !text-xs" onClick={() => redrive(d.id)}>
                    Redrive now
                  </Button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <section className="bg-surface-container-low rounded-2xl px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">
            Page {currentPage} / {meta.totalPages}
          </span>
          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <Button variant="secondary" className="!py-2" onClick={() => setPage(currentPage - 1)}>
                Previous
              </Button>
            )}
            {currentPage < meta.totalPages && (
              <Button variant="secondary" className="!py-2" onClick={() => setPage(currentPage + 1)}>
                Next
              </Button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
