// Pick the API base URL based on where the code runs:
//  - On the server (loaders/actions) use the internal Docker DNS via
//    `STELLARPOD_API_URL` so Remix talks to the API container directly.
//  - In the browser, read `window.ENV.PUBLIC_API_URL` that the root loader
//    injects at render time (e.g. https://api.stelo.life).
declare global {
  interface Window {
    ENV?: { PUBLIC_API_URL?: string };
  }
}

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.ENV?.PUBLIC_API_URL || "http://localhost:8000";
  }
  if (typeof process !== "undefined") {
    return (
      process.env.STELLARPOD_API_URL ||
      process.env.PUBLIC_API_URL ||
      "http://localhost:8000"
    );
  }
  return "http://localhost:8000";
}

/**
 * Derive a deterministic store ID from a Stellar wallet address.
 * Must match the server-side derivation in ShopifySessionGuard.
 */
export function deriveStoreId(walletAddress: string): string {
  return `wallet-${walletAddress.slice(0, 16).toLowerCase()}`;
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  walletAddress?: string;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function api<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    token,
    walletAddress,
    headers: customHeaders,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  // Route selection:
  //   Server side (Remix loader/action): talk to the API directly and
  //     attach X-Stelo-Proxy-Secret from process.env.
  //   Browser side with a walletAddress: the API refuses X-Wallet-Address
  //     without the proxy secret, and the secret must NEVER ship to the
  //     client bundle. So we route the call through the Remix catchall
  //     proxy at /api/proxy/<endpoint>, which re-reads the wallet from
  //     the session cookie on the server and re-attaches the proxy secret.
  //   Browser side without walletAddress (token-auth or unauthenticated):
  //     hit the API directly as before.
  const isServer = typeof window === "undefined";
  const useProxy = !isServer && !!walletAddress;

  if (walletAddress && !useProxy) {
    headers["X-Wallet-Address"] = walletAddress;
    if (typeof process !== "undefined" && process.env?.STELO_PROXY_SECRET) {
      headers["X-Stelo-Proxy-Secret"] = process.env.STELO_PROXY_SECRET;
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Build the request URL. For proxied client calls we encode the
  // upstream path + query under /api/proxy/<path>?<qs>. We rebuild the
  // URL to separate path from query string so the Remix route can read
  // them independently.
  const requestUrl = useProxy
    ? `/api/proxy${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
    : `${resolveApiBaseUrl()}${endpoint}`;

  try {
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: (errorData as { message?: string }).message || `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json() as T;
    return { data, error: null, status: response.status };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error occurred",
      status: 0,
    };
  }
}

// Convenience methods. Pass the wallet address (from `requireUser`) so the
// API receives an `X-Wallet-Address` header — the backend can later be
// upgraded to require this for authenticated endpoints.
export const apiGet = <T>(endpoint: string, walletAddress?: string) =>
  api<T>(endpoint, { method: "GET", walletAddress });

export const apiPost = <T>(
  endpoint: string,
  body: unknown,
  walletAddress?: string,
) => api<T>(endpoint, { method: "POST", body, walletAddress });

export const apiPut = <T>(
  endpoint: string,
  body: unknown,
  walletAddress?: string,
) => api<T>(endpoint, { method: "PUT", body, walletAddress });

export const apiPatch = <T>(
  endpoint: string,
  body: unknown,
  walletAddress?: string,
) => api<T>(endpoint, { method: "PATCH", body, walletAddress });

export const apiDelete = <T>(endpoint: string, walletAddress?: string) =>
  api<T>(endpoint, { method: "DELETE", walletAddress });

// ---------------------------------------------------------------------------
// Gating endpoints
// ---------------------------------------------------------------------------

export interface GatingData {
  merchantProductId: string;
  assetCode: string;
  issuerAddress: string;
  assetType: "CLASSIC" | "SOROBAN_SAC";
  minBalance: string;
  errorMessage: string | null;
  isActive: boolean;
}

export interface UpsertGatingPayload {
  merchantProductId: string;
  assetCode: string;
  issuerAddress: string;
  assetType: "CLASSIC" | "SOROBAN_SAC";
  minBalance?: string;
  errorMessage?: string;
  isActive?: boolean;
}

/**
 * Fetch the gating rule for a merchant product.
 * Returns null when no rule exists (404 is treated as "not configured").
 * Intended for use inside Remix server-side loaders.
 */
export async function getGatingServer(
  productId: string,
  walletAddress: string,
): Promise<GatingData | null> {
  const res = await apiGet<GatingData>(
    `/gating?merchantProductId=${encodeURIComponent(productId)}`,
    walletAddress,
  );
  if (res.status === 404) return null;
  if (res.error) throw new Error(`getGating failed: ${res.error}`);
  return res.data;
}

// ---------------------------------------------------------------------------
// Royalty Splits endpoints
// ---------------------------------------------------------------------------

import type { RoyaltySplit } from "~/lib/types";

/**
 * Fetch royalty splits for a scope (DESIGN or MERCHANT_PRODUCT).
 * Returns [] when none configured (404 treated as "not set").
 * Intended for Remix server-side loaders — uses walletAddress auth.
 */
export async function getRoyaltySplitsServer(
  scopeType: "DESIGN" | "MERCHANT_PRODUCT",
  scopeId: string,
  walletAddress: string,
): Promise<RoyaltySplit[]> {
  const res = await apiGet<RoyaltySplit[]>(
    `/royalty-splits?scopeType=${encodeURIComponent(scopeType)}&scopeId=${encodeURIComponent(scopeId)}`,
    walletAddress,
  );
  if (res.status === 404) return [];
  if (res.error) throw new Error(`getRoyaltySplits failed: ${res.error}`);
  return res.data ?? [];
}

/**
 * Create or replace royalty splits for a scope.
 * Client-side call — routes through the Remix proxy so the wallet session
 * cookie is used for auth (same pattern as GatingForm → api()).
 */
export async function upsertRoyaltySplits(payload: {
  scopeType: "DESIGN" | "MERCHANT_PRODUCT";
  scopeId: string;
  splits: Array<{
    walletAddress: string;
    percentBps: number;
    role: string;
    label?: string;
  }>;
}): Promise<RoyaltySplit[]> {
  const res = await apiPost<RoyaltySplit[]>(
    "/royalty-splits",
    payload,
  );
  if (res.error) throw new Error(`upsertRoyaltySplits failed: ${res.error}`);
  return res.data ?? [];
}

/**
 * Remove all royalty splits for a scope.
 * Client-side call.
 */
export async function clearRoyaltySplits(
  scopeType: "DESIGN" | "MERCHANT_PRODUCT",
  scopeId: string,
): Promise<void> {
  const res = await apiDelete(
    `/royalty-splits/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeId)}`,
  );
  if (res.error) throw new Error(`clearRoyaltySplits failed: ${res.error}`);
}

/**
 * Request a nonce challenge for wallet-ownership verification of a split.
 * Client-side call.
 */
export async function verifySplitChallenge(
  splitId: string,
): Promise<{ nonce: string; expiresAt: string }> {
  const res = await apiPost<{ nonce: string; expiresAt: string }>(
    `/royalty-splits/${encodeURIComponent(splitId)}/verify-challenge`,
    {},
  );
  if (res.error) throw new Error(`verifySplitChallenge failed: ${res.error}`);
  return res.data!;
}

/**
 * Submit a signed nonce to confirm wallet ownership for a split.
 * Client-side call.
 */
export async function confirmSplitChallenge(
  splitId: string,
  signedNonce: string,
): Promise<{ verified: boolean }> {
  const res = await apiPost<{ verified: boolean }>(
    `/royalty-splits/${encodeURIComponent(splitId)}/verify-confirm`,
    { signedNonce },
  );
  if (res.error) throw new Error(`confirmSplitChallenge failed: ${res.error}`);
  return res.data!;
}

// ---------------------------------------------------------------------------
// Public provenance endpoint — no auth required, safe to call from loaders
// ---------------------------------------------------------------------------

export interface ProvenanceRecord {
  designId: string;
  assetCode: string | null;
  status: string;
  storeName: string;
  ownerWallet: string;
  fileSha256: string;
  registeredAt: string;
  mintLedger: number | null;
  stellarExplorerUrl: string | null;
}

/**
 * Fetch provenance data for a design. Throws a Remix `Response` on 404 so
 * the nearest `ErrorBoundary` / `CatchBoundary` can render a proper 404 page.
 * Throws a plain `Error` for other non-OK responses.
 *
 * Intended for use inside Remix server-side loaders only.
 */
export async function getProvenancePublic(
  designId: string,
): Promise<ProvenanceRecord> {
  const apiUrl =
    process.env.STELLARPOD_API_URL ||
    process.env.PUBLIC_API_URL ||
    "http://localhost:8000";

  const res = await fetch(
    `${apiUrl}/provenance/${encodeURIComponent(designId)}`,
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Response("Design not found", { status: 404 });
    }
    throw new Error(`Provenance API error: ${res.status}`);
  }

  return res.json() as Promise<ProvenanceRecord>;
}
