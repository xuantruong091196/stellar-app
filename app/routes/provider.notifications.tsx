import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams, Link } from "@remix-run/react";
import { api } from "~/lib/api";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { pageMeta } from "~/lib/seo";

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  link: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "orders", label: "Orders" },
  { value: "escrow", label: "Payments" },
  { value: "shipping", label: "Shipping" },
  { value: "disputes", label: "Disputes" },
  { value: "system", label: "System" },
];

const CATEGORY_ICONS: Record<string, string> = {
  orders: "shopping_cart",
  escrow: "account_balance_wallet",
  shipping: "local_shipping",
  disputes: "gavel",
  system: "settings",
};

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Provider Notifications",
    description: "All your provider notifications — new orders, payments, disputes.",
    path: "/provider/notifications",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/provider_token=([^;]+)/);
  const token = tokenMatch?.[1];
  const url = new URL(request.url);
  if (!token) {
    const nextParam = encodeURIComponent(url.pathname + url.search);
    return redirect(`/provider-login?next=${nextParam}`);
  }

  const category = url.searchParams.get("category") || "";
  const unread = url.searchParams.get("unread") || "";
  const page = url.searchParams.get("page") || "1";

  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", "20");
  if (category) params.set("category", category);
  if (unread === "true") params.set("unread", "true");

  const res = await api<NotificationsResponse>(
    `/notifications?${params.toString()}`,
    { token },
  );

  return json({
    notifications: res.data?.data || [],
    meta: res.data?.meta || null,
    error: res.error,
    currentCategory: category,
    currentUnread: unread === "true",
    currentPage: parseInt(page, 10),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/provider_token=([^;]+)/);
  const token = tokenMatch?.[1];
  if (!token) return json({ error: "Not authenticated" }, { status: 401 });

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "mark-read") {
    const id = formData.get("id") as string;
    const res = await api(`/notifications/${id}/read`, { method: "PATCH", token });
    return json({ success: !res.error, error: res.error });
  }

  if (intent === "mark-all-read") {
    const res = await api(`/notifications/read-all`, { method: "PATCH", token });
    return json({ success: !res.error, error: res.error });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
}

export default function ProviderNotificationsPage() {
  const { notifications, meta, currentCategory, currentUnread, currentPage } =
    useLoaderData<typeof loader>();
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

  const markAsRead = (id: string) => {
    fetcher.submit({ intent: "mark-read", id }, { method: "post" });
  };

  const markAllAsRead = () => {
    fetcher.submit({ intent: "mark-all-read" }, { method: "post" });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={meta ? `${meta.total} total` : "Your notification history"}
        actions={
          <Button variant="secondary" icon="done_all" onClick={markAllAsRead} className="!py-2">
            Mark all read
          </Button>
        }
      />

      <section className="bg-surface-container-low rounded-2xl p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-2">
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value || "all"}
              type="button"
              onClick={() => setParam("category", cat.value)}
              className={
                currentCategory === cat.value
                  ? "stellar-gradient text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
              }
            >
              {cat.label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setParam("unread", currentUnread ? "" : "true")}
              className={
                currentUnread
                  ? "bg-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  : "bg-surface-container-high text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
              }
            >
              Unread only
            </button>
          </div>
        </div>
      </section>

      {notifications.length === 0 ? (
        <section className="bg-surface-container-low rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">
            notifications_off
          </span>
          <p className="text-sm text-on-surface-variant mt-4">No notifications found</p>
        </section>
      ) : (
        <section className="bg-surface-container-low rounded-2xl divide-y divide-outline-variant/10">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            const icon = CATEGORY_ICONS[n.category] || "notifications";
            const content = (
              <div className="flex items-start gap-4 px-6 py-4 hover:bg-surface-container transition-colors">
                <div
                  className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isUnread ? "stellar-gradient" : "bg-surface-container-high"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      isUnread ? "text-white" : "text-on-surface-variant"
                    }`}
                  >
                    {icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${isUnread ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-on-surface-variant/60 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant/80 mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold">
                      {n.category}
                    </span>
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          markAsRead(n.id);
                        }}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );

            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => isUnread && markAsRead(n.id)}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </section>
      )}

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
    </div>
  );
}
