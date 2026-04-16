import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { api } from "~/lib/api";
import { requireUser } from "~/lib/session.server";

/**
 * Server-side proxy for authenticated notification endpoints.
 *
 * The merchant bell calls `/notifications/*` from the browser with an
 * `X-Wallet-Address` header. After the proxy-secret guard was added, the
 * API rejects wallet headers without `X-Stelo-Proxy-Secret`, which is a
 * server-only env var. So all the wallet-authed notification calls need
 * to go through a Remix loader/action that runs on the server and uses
 * the `api()` helper (which attaches the proxy secret automatically).
 *
 * Provider-authed callers (JWT Bearer) don't need this — the API accepts
 * their `Authorization: Bearer` header directly. They can still hit the
 * API from the browser. This proxy is only used by merchant wallet auth.
 *
 * Supported ops:
 *   GET  /api/notifications/list?page=&limit=&category=&unread=
 *   GET  /api/notifications/unread-count
 *   POST /api/notifications/session        — creates an SSE session token
 *   POST /api/notifications/mark-read      — body: { id }
 *   POST /api/notifications/mark-all-read
 */
const GET_OPS = new Set(["list", "unread-count"]);
const POST_OPS = new Set(["session", "mark-read", "mark-all-read"]);

export async function loader({ request, params }: LoaderFunctionArgs) {
  const op = params.op;
  if (!op || !GET_OPS.has(op)) {
    return json({ error: "Unknown op" }, { status: 404 });
  }

  const walletAddress = await requireUser(request);
  const url = new URL(request.url);

  if (op === "list") {
    const qs = url.searchParams.toString();
    const res = await api(`/notifications${qs ? `?${qs}` : ""}`, {
      walletAddress,
    });
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  if (op === "unread-count") {
    const res = await api(`/notifications/unread-count`, { walletAddress });
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  return json({ error: "Unknown op" }, { status: 404 });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const op = params.op;
  if (!op || !POST_OPS.has(op)) {
    return json({ error: "Unknown op" }, { status: 404 });
  }

  const walletAddress = await requireUser(request);

  if (op === "session") {
    const res = await api(`/notifications/session`, {
      method: "POST",
      body: {},
      walletAddress,
    });
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  if (op === "mark-read") {
    let body: { id?: string };
    try {
      body = (await request.json()) as { id?: string };
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body.id || typeof body.id !== "string") {
      return json({ error: "Missing id" }, { status: 400 });
    }
    const res = await api(
      `/notifications/${encodeURIComponent(body.id)}/read`,
      { method: "PATCH", walletAddress },
    );
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  if (op === "mark-all-read") {
    const res = await api(`/notifications/read-all`, {
      method: "PATCH",
      walletAddress,
    });
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  return json({ error: "Unknown op" }, { status: 404 });
}
