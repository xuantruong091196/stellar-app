import { useState, useCallback } from "react";

interface Props {
  escrowId: string;
  providerOrderId: string;
  walletAddress: string;
  onSuccess: () => void;
  variant?: "inline" | "block";
}

type SignState =
  | "idle"
  | "loading-xdr"
  | "signing"
  | "submitting"
  | "success"
  | "error";

/**
 * Sign-and-lock escrow button. Fetches an unsigned Stellar XDR from the API,
 * asks Freighter to sign it, then submits the signed XDR to confirm the lock.
 *
 * `variant="inline"` — small text button suitable for table rows.
 * `variant="block"` — full-width primary button suitable for the order detail sidebar.
 */
export function SignEscrowButton({
  escrowId,
  providerOrderId,
  walletAddress,
  onSuccess,
  variant = "inline",
}: Props) {
  const [state, setState] = useState<SignState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSign = useCallback(async () => {
    setState("loading-xdr");
    setError(null);
    try {
      // Step 1: get unsigned XDR via the Remix server-side proxy. The
      // browser can't auth directly to the API anymore — the proxy route
      // attaches the wallet from the session and the Stelo proxy secret
      // (server-only) before forwarding.
      const xdrRes = await fetch(
        `/api/escrow/lock/${encodeURIComponent(providerOrderId)}`,
        { method: "POST" },
      );
      if (!xdrRes.ok) {
        const body = await xdrRes.json().catch(() => ({}));
        throw new Error(
          body.message || body.error || `Failed to build escrow tx: ${xdrRes.status}`,
        );
      }
      const { escrowId: eid, unsignedXdr } = await xdrRes.json();

      // Step 2: sign with Freighter (client-only — wallet extension)
      setState("signing");
      const { signTransactionXdr } = await import("~/lib/stellar");
      const signedXdr = await signTransactionXdr(unsignedXdr);

      // Step 3: confirm via the proxy route
      setState("submitting");
      const confirmRes = await fetch(
        `/api/escrow/${encodeURIComponent(eid || escrowId)}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedXdr }),
        },
      );
      if (!confirmRes.ok) {
        const body = await confirmRes.json().catch(() => ({}));
        throw new Error(
          body.message || body.error || `Confirm failed: ${confirmRes.status}`,
        );
      }

      setState("success");
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }, [escrowId, providerOrderId, onSuccess]);

  const labels: Record<SignState, string> = {
    idle: "Sign & Lock",
    "loading-xdr": "Building tx…",
    signing: "Approve in Freighter…",
    submitting: "Submitting…",
    success: "Locked",
    error: "Retry",
  };

  const inFlight =
    state === "loading-xdr" || state === "signing" || state === "submitting";

  if (variant === "block") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSign}
          disabled={inFlight || state === "success"}
          className={`w-full px-4 py-3 rounded-full font-bold text-sm transition-all disabled:opacity-50 ${
            state === "success"
              ? "bg-green-500/20 text-green-300"
              : state === "error"
                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                : "stellar-gradient text-white hover:brightness-110"
          }`}
        >
          {labels[state]}
        </button>
        {error && (
          <p className="text-[11px] text-red-400 leading-tight">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleSign}
        disabled={inFlight || state === "success"}
        className={`text-xs font-bold hover:underline disabled:opacity-50 ${
          state === "success"
            ? "text-green-400"
            : state === "error"
              ? "text-red-400"
              : "text-primary"
        }`}
      >
        {labels[state]}
      </button>
      {error && (
        <p className="text-[10px] text-red-400 max-w-[140px] leading-tight">
          {error}
        </p>
      )}
    </div>
  );
}
