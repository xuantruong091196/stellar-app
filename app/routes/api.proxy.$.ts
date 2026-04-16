import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { api } from "~/lib/api";
import { requireUser } from "~/lib/session.server";

/**
 * Catchall server-side proxy for wallet-authed browser calls.
 *
 * Why this exists:
 *   The API guard refuses `X-Wallet-Address` without the shared
 *   `X-Stelo-Proxy-Secret` (prevents arbitrary HTTP clients from claiming
 *   ownership of any wallet by hitting the API port directly). That secret
 *   must never ship to the browser bundle, so every wallet-authed call
 *   from a React component must round-trip through a Remix route that
 *   reruns on the server and attaches the secret from `process.env`.
 *
 *   `api()` automatically routes browser-side wallet calls to
 *   `/api/proxy/<upstream-path>` — this handler picks them up.
 *
 * Security posture:
 *   - `requireUser` verifies the SIWS-authenticated session cookie, so
 *     the wallet address attached upstream is the one the browser owns.
 *   - Admin-only upstream paths are explicitly rejected here; merchants
 *     should never be able to drive admin endpoints via proxy.
 *   - Only safe HTTP methods pass through (DELETE is allowed because
 *     existing UI uses it — e.g. disconnect provider).
 *   - Body is forwarded as JSON; `text/plain`, `multipart/form-data`,
 *     and anything else is rejected. Uploads go through S3/R2 presigned
 *     URLs, not this route.
 */

// Paths that must never be callable from the browser, even through proxy.
// These are either admin-scoped or cross-tenant.
const BLOCKED_PREFIXES = [
  "/admin",
  "/provider-auth", // Provider signup/login should go through their own routes
  "/shopify/webhooks", // Webhooks have HMAC auth
  "/webhooks/outbound", // Admin-visible delivery log
];

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

async function handle(
  request: Request,
  params: LoaderFunctionArgs["params"],
) {
  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const walletAddress = await requireUser(request);

  // Reconstruct the upstream path. Remix gives us the wildcard segment
  // via params["*"]; the original query string is on request.url.
  const wildcard = params["*"] ?? "";
  const upstreamPath = wildcard.startsWith("/") ? wildcard : `/${wildcard}`;

  for (const blocked of BLOCKED_PREFIXES) {
    if (upstreamPath === blocked || upstreamPath.startsWith(`${blocked}/`)) {
      return json({ error: "Path not proxiable" }, { status: 403 });
    }
  }

  const url = new URL(request.url);
  const qs = url.search; // includes leading `?` or empty string
  const upstream = `${upstreamPath}${qs}`;

  // Only forward JSON bodies. Reject anything else so a misconfigured
  // client (e.g. a form POST) doesn't silently drop its body.
  let body: unknown;
  if (method !== "GET" && method !== "DELETE") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType && !contentType.includes("application/json")) {
      return json(
        { error: "Only application/json bodies are proxied" },
        { status: 415 },
      );
    }
    if (contentType) {
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }
  }

  const res = await api(upstream, {
    method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    body,
    walletAddress,
  });

  return json(res.data ?? { error: res.error }, { status: res.status || 200 });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return handle(request, params);
}

export async function action({ request, params }: ActionFunctionArgs) {
  return handle(request, params);
}
