/**
 * Freighter wallet helpers for the marketplace buy flow.
 *
 * Delegates to the existing stellar.ts wrappers (which already use
 * @stellar/freighter-api v6 with the correct object-return conventions).
 * We add:
 *  - A typed FreighterError class so the UI can distinguish wallet errors
 *    from network/backend errors.
 *  - An empty-XDR guard that surfaces the "backend stub" state clearly
 *    instead of letting Freighter choke on an empty string.
 */
import {
  isWalletAvailable,
  connectWallet,
  signTransactionXdr,
} from "~/lib/stellar";

export class FreighterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreighterError";
  }
}

/**
 * Ensure Freighter is installed + connected, then return the active wallet
 * address. Throws FreighterError with a user-friendly message on any failure.
 */
export async function ensureFreighter(): Promise<string> {
  if (typeof window === "undefined") {
    throw new FreighterError("Freighter is only available in the browser.");
  }

  const available = await isWalletAvailable();
  if (!available) {
    throw new FreighterError(
      "Please install the Freighter Stellar wallet extension (https://freighter.app)",
    );
  }

  try {
    const { address } = await connectWallet();
    if (!address) throw new FreighterError("No wallet address returned by Freighter.");
    return address;
  } catch (err) {
    if (err instanceof FreighterError) throw err;
    throw new FreighterError(
      err instanceof Error ? err.message : "Failed to connect Freighter wallet.",
    );
  }
}

/**
 * Sign a Stellar transaction XDR with Freighter.
 *
 * Empty-XDR guard: the marketplace backend returns an empty string while the
 * Soroban submission path is stubbed. We catch this and throw a clear
 * FreighterError so the UI shows a meaningful message instead of a cryptic
 * wallet error.
 *
 * walletAddress is accepted for API symmetry / future per-address signing but
 * is not forwarded — stellar.ts reads the active Freighter address itself.
 */
export async function signXdr(
  xdr: string,
  _walletAddress: string,
): Promise<string> {
  if (!xdr) {
    throw new FreighterError(
      "Marketplace buy is not yet enabled (backend Soroban path stubbed). " +
        "Try again after the next deploy.",
    );
  }

  try {
    return await signTransactionXdr(xdr);
  } catch (err) {
    if (err instanceof FreighterError) throw err;
    throw new FreighterError(
      err instanceof Error ? err.message : "Freighter rejected the signing request.",
    );
  }
}
