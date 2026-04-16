import { useState, useCallback, useEffect } from "react";
import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, useSearchParams } from "@remix-run/react";
import {
  getSession,
  commitSession,
  getUserAddress,
} from "~/lib/session.server";
import {
  generateNonce,
  buildSignInMessage,
  verifySignature,
  isValidStellarAddress,
  NONCE_TTL_MS,
} from "~/lib/stellar-verify.server";
import {
  connectWallet,
  signSignInMessage,
  isWalletAvailable,
  truncateAddress,
} from "~/lib/stellar";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Sign In",
    description:
      "Sign in to Stelo with your Stellar wallet. Passwordless, non-custodial authentication via Sign-In With Stellar.",
    path: "/login",
  });

/**
 * Validate that a `next` redirect target is a safe in-app path.
 *
 * Rejects absolute URLs (http://, https://, //host.com), protocol-relative
 * URLs, and anything that doesn't start with `/`. Falls back to `/dashboard`
 * on any mismatch. This closes an open-redirect vulnerability — before this
 * check, `/login?next=https://evil.com` would bounce the user off-site after
 * sign-in.
 */
function safeNext(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/dashboard";
  // Must start with a single `/` and not `//` (protocol-relative).
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  // Block backslash-based bypasses (some browsers normalize `/\evil.com`).
  if (next.includes("\\")) return "/dashboard";
  return next;
}

// ─── Loader: if already signed in, bounce to dashboard ───────────
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserAddress(request);
  if (user) {
    const url = new URL(request.url);
    throw redirect(safeNext(url.searchParams.get("next")));
  }
  return json({});
}

// ─── Action: handles ?_action=nonce and ?_action=verify ──────────
export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const intent = url.searchParams.get("_action");
  const formData = await request.formData();
  const session = await getSession(request);

  if (intent === "nonce") {
    const address = formData.get("address") as string;
    if (!address || !isValidStellarAddress(address)) {
      return json(
        { ok: false, error: "Invalid Stellar address" },
        { status: 400 },
      );
    }

    const nonce = generateNonce();
    const domain = url.host;
    const message = buildSignInMessage({ address, nonce, domain });

    session.set("pendingNonce", nonce);
    session.set("pendingAddress", address);
    session.set("pendingExpiresAt", Date.now() + NONCE_TTL_MS);

    return json(
      { ok: true as const, message, nonce },
      {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      },
    );
  }

  if (intent === "verify") {
    const address = formData.get("address") as string;
    const signature = formData.get("signature") as string;
    const next = safeNext(formData.get("next") as string | null);

    // eslint-disable-next-line no-console

    const pendingNonce = session.get("pendingNonce");
    const pendingAddress = session.get("pendingAddress");
    const pendingExpiresAt = session.get("pendingExpiresAt");

    if (!pendingNonce || !pendingAddress || !pendingExpiresAt) {
      return json(
        { ok: false, error: "No pending sign-in. Please try again." },
        { status: 400 },
      );
    }
    if (Date.now() > pendingExpiresAt) {
      return json(
        { ok: false, error: "Sign-in expired. Please try again." },
        { status: 400 },
      );
    }
    if (address !== pendingAddress) {
      return json(
        { ok: false, error: "Wallet address changed mid-flow." },
        { status: 400 },
      );
    }

    const message = buildSignInMessage({
      address,
      nonce: pendingNonce,
      domain: url.host,
    });

    const valid = verifySignature({
      address,
      message,
      signatureBase64: signature,
    });

    if (!valid) {
      return json(
        { ok: false, error: "Signature verification failed." },
        { status: 401 },
      );
    }

    // Success: clear pending data, set verified address.
    session.unset("pendingNonce");
    session.unset("pendingAddress");
    session.unset("pendingExpiresAt");
    session.set("userAddress", address);

    throw redirect(next, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  return json({ ok: false, error: "Unknown intent" }, { status: 400 });
}

// ─── Client component ────────────────────────────────────────────
type Step = "idle" | "connecting" | "signing" | "verifying" | "error";

export default function Login() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const nonceFetcher = useFetcher<{
    ok: boolean;
    message?: string;
    nonce?: string;
    error?: string;
  }>();
  const verifyFetcher = useFetcher<{ ok?: boolean; error?: string }>();

  const [step, setStep] = useState<Step>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);

  // Probe the Freighter extension on mount so we can show install CTA.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isWalletAvailable();
      if (!cancelled) setHasFreighter(available);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When the nonce action returns, ask the wallet to sign the message.
  useEffect(() => {
    if (nonceFetcher.state !== "idle") return;
    const data = nonceFetcher.data;
    if (!data) return;
    if (!data.ok) {
      setError(data.error || "Failed to request nonce");
      setStep("error");
      return;
    }
    if (!data.message || !address) return;

    (async () => {
      try {
        setStep("signing");
        const signature = await signSignInMessage(data.message!);
        const form = new FormData();
        form.set("address", address);
        form.set("signature", signature);
        form.set("next", next);
        setStep("verifying");
        verifyFetcher.submit(form, {
          method: "post",
          action: `/login?_action=verify`,
        });
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Wallet rejected the signing request",
        );
        setStep("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonceFetcher.state, nonceFetcher.data]);

  // Handle verify failures (success = server redirect, handled automatically).
  useEffect(() => {
    if (verifyFetcher.state !== "idle") return;
    const data = verifyFetcher.data;
    if (!data) return;
    if (data.ok === false) {
      setError(data.error || "Verification failed");
      setStep("error");
    }
  }, [verifyFetcher.state, verifyFetcher.data]);

  const handleConnect = useCallback(async () => {
    setError(null);
    try {
      setStep("connecting");
      const wallet = await connectWallet();
      setAddress(wallet.address);

      const form = new FormData();
      form.set("address", wallet.address);
      nonceFetcher.submit(form, {
        method: "post",
        action: `/login?_action=nonce`,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to connect wallet",
      );
      setStep("error");
    }
  }, [nonceFetcher]);

  const busy = step === "connecting" || step === "signing" || step === "verifying";

  const statusLabel =
    step === "connecting"
      ? "Requesting wallet access…"
      : step === "signing"
        ? "Waiting for signature in Freighter…"
        : step === "verifying"
          ? "Verifying signature on the server…"
          : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 stellar-gradient opacity-10 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.1), transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img
              src="/images/logo.png"
              alt="Stelo logo"
              className="w-12 h-12 rounded-2xl object-contain shadow-lg"
            />
            <span className="text-2xl font-bold stellar-text-gradient font-headline">
              Stelo
            </span>
          </div>
          <h1 className="text-3xl font-headline font-bold">
            Sign in to Mission Control
          </h1>
          <p className="text-on-surface-variant mt-2">
            Connect your Stellar wallet to access your print-on-demand
            dashboard.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-low rounded-3xl p-8 space-y-6 backdrop-blur-md">
          {hasFreighter === false && (
            <div className="bg-amber-400/10 border border-amber-400/20 text-amber-200 px-4 py-3 rounded-2xl text-sm">
              <p className="font-bold">Freighter not detected</p>
              <p className="opacity-80 mt-1">
                Install the Freighter browser extension, then refresh this
                page.{" "}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-amber-300"
                >
                  Get Freighter →
                </a>
              </p>
            </div>
          )}

          {error && step === "error" && (
            <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl text-sm">
              <p className="font-bold">Sign-in failed</p>
              <p className="opacity-80 mt-1">{error}</p>
            </div>
          )}

          {address && (
            <div className="bg-surface-container p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Connected wallet
                </p>
                <p className="font-mono text-sm mt-1">
                  {truncateAddress(address)}
                </p>
              </div>
              <span className="material-symbols-outlined text-green-400">
                check_circle
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleConnect}
            disabled={busy || hasFreighter === false}
            className="w-full stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {busy ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {statusLabel}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" aria-hidden>
                  account_balance_wallet
                </span>
                {address ? "Sign In Again" : "Connect Freighter Wallet"}
              </>
            )}
          </button>

          {/* Handshake step hint */}
          <div className="space-y-2 pt-2">
            <StepHint
              active={step === "connecting"}
              done={step === "signing" || step === "verifying"}
              label="1. Authorize Freighter"
            />
            <StepHint
              active={step === "signing"}
              done={step === "verifying"}
              label="2. Sign nonce"
            />
            <StepHint
              active={step === "verifying"}
              done={false}
              label="3. Verify on server"
            />
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6 max-w-sm mx-auto">
          Sign-In With Stellar proves you own this wallet by signing a
          one-time message. No transactions are submitted. No fees.
        </p>
      </div>
    </div>
  );
}

function StepHint({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div
        className={
          done
            ? "w-5 h-5 rounded-full bg-green-400/20 border border-green-400 flex items-center justify-center"
            : active
              ? "w-5 h-5 rounded-full stellar-gradient flex items-center justify-center animate-pulse"
              : "w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant/20"
        }
      >
        {done && (
          <span className="material-symbols-outlined text-green-400 text-[12px]">
            check
          </span>
        )}
      </div>
      <span
        className={
          done || active
            ? "text-on-surface font-medium"
            : "text-on-surface-variant"
        }
      >
        {label}
      </span>
    </div>
  );
}
