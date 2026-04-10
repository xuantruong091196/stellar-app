import { createCookieSessionStorage, redirect } from "@remix-run/node";

// ─── Session storage ──────────────────────────────────────────────
// Stores verified wallet address after Sign-In-With-Stellar flow.
// The nonce is held temporarily in the same cookie during the sign-in
// handshake, then replaced by the verified `userAddress`.

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "dev-only-insecure-stellarpod-session-secret-change-me");

if (!SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET env var is required in production. Generate one with `openssl rand -hex 32`.",
  );
}

interface SessionData {
  userAddress: string;
  // Temporary, during the sign-in handshake:
  pendingNonce: string;
  pendingAddress: string;
  pendingExpiresAt: number;
}

interface FlashData {
  error: string;
}

export const sessionStorage = createCookieSessionStorage<
  SessionData,
  FlashData
>({
  cookie: {
    name: "__stelo_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
  },
});

export async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

export async function commitSession(
  session: Awaited<ReturnType<typeof getSession>>,
) {
  return sessionStorage.commitSession(session);
}

export async function destroySession(
  session: Awaited<ReturnType<typeof getSession>>,
) {
  return sessionStorage.destroySession(session);
}

/** Return the verified wallet address from the cookie, or null. */
export async function getUserAddress(
  request: Request,
): Promise<string | null> {
  const session = await getSession(request);
  return session.get("userAddress") ?? null;
}

/**
 * Gate a loader/action behind an authenticated wallet. If the user has not
 * signed in, they are redirected to `/login?next=...`. Returns the verified
 * wallet address when called from an authenticated session.
 */
export async function requireUser(
  request: Request,
  redirectTo?: string,
): Promise<string> {
  const address = await getUserAddress(request);
  if (!address) {
    const url = new URL(request.url);
    const next = redirectTo ?? url.pathname + url.search;
    const params = new URLSearchParams({ next });
    throw redirect(`/login?${params}`);
  }
  return address;
}
