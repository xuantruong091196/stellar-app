import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { api } from "~/lib/api";
import { requireUser } from "~/lib/session.server";

/**
 * Server-side proxy for the authenticated clipart AI endpoints.
 *
 * The browser can't call `/clipart/ai-*` directly because the API now
 * requires `X-Wallet-Address` plus the `X-Stelo-Proxy-Secret` shared key.
 * Neither belongs in a client bundle (proxy secret is server-only). This
 * route runs server-side, pulls the wallet from the Remix session, and
 * the `api()` helper attaches the proxy secret from `process.env`.
 *
 * Usage from the browser:
 *   POST /api/clipart/ai-enhance      (body: AiEnhanceDto)
 *   POST /api/clipart/ai-remove-bg
 *   POST /api/clipart/ai-generate
 *   POST /api/clipart/ai-upscale
 *   GET  /api/clipart/search?q=...    (proxy for /clipart/search)
 *   GET  /api/clipart/download?id=... (proxy for /clipart/download/:id)
 */
const ALLOWED_OPS = new Set([
  "ai-enhance",
  "ai-remove-bg",
  "ai-generate",
  "ai-upscale",
  "search",
  "download",
]);

export async function loader({ request, params }: LoaderFunctionArgs) {
  const op = params.op;
  if (!op || !ALLOWED_OPS.has(op)) {
    return json({ error: "Unknown clipart op" }, { status: 404 });
  }

  // The two GET ops: search (query string) + download (?id=...)
  if (op === "search") {
    const walletAddress = await requireUser(request);
    const url = new URL(request.url);
    const qs = url.searchParams.toString();
    const res = await api(`/clipart/search${qs ? `?${qs}` : ""}`, {
      walletAddress,
    });
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  if (op === "download") {
    const walletAddress = await requireUser(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id" }, { status: 400 });
    const res = await api(`/clipart/download/${encodeURIComponent(id)}`, {
      walletAddress,
    });
    return json(res.data ?? { error: res.error }, { status: res.status || 200 });
  }

  return json({ error: "Use POST for AI ops" }, { status: 405 });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const op = params.op;
  if (!op || !ALLOWED_OPS.has(op) || op === "search" || op === "download") {
    return json({ error: "Unknown clipart op" }, { status: 404 });
  }

  const walletAddress = await requireUser(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const res = await api(`/clipart/${op}`, {
    method: "POST",
    body,
    walletAddress,
  });

  return json(res.data ?? { error: res.error }, { status: res.status || 200 });
}
