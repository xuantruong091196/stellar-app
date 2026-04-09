// @stellar/freighter-api v6+ — object return types with error field
import pkg from "@stellar/freighter-api";
const {
  isConnected,
  getAddress,
  requestAccess,
  setAllowed,
  signMessage,
  signTransaction,
  getNetworkDetails,
} = pkg;

export interface WalletInfo {
  address: string;
  connected: boolean;
  network?: string;
}

/** Freighter returns `{ isConnected: boolean, error? }` since v6. */
export async function isWalletAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await isConnected();
    return Boolean(res?.isConnected);
  } catch {
    return false;
  }
}

/**
 * Connect to Freighter and return the active wallet address.
 *
 * Freighter v6 API:
 *  - `requestAccess()` returns `{ address, error? }`
 *  - `getAddress()` returns `{ address, error? }`
 *  - `isConnected()` returns `{ isConnected, error? }`
 */
export async function connectWallet(): Promise<WalletInfo> {
  if (typeof window === "undefined") {
    throw new Error("Wallet can only be connected from the browser.");
  }

  const conn = await isConnected();
  if (!conn?.isConnected) {
    throw new Error(
      "Freighter wallet extension is not installed. Get it at https://freighter.app",
    );
  }

  await setAllowed();

  let address = "";
  const access = await requestAccess();
  if (access?.error) {
    // requestAccess may fail if user already granted — fall back to getAddress.
    const addr = await getAddress();
    if (addr?.error) throw new Error(addr.error.message || "Failed to read wallet address.");
    address = addr.address;
  } else {
    address = access.address;
  }

  if (!address) {
    throw new Error("Failed to retrieve wallet address from Freighter.");
  }

  let network: string | undefined;
  try {
    const details = await getNetworkDetails();
    network = details?.network;
  } catch {
    network = undefined;
  }

  return { address, connected: true, network };
}

/**
 * Sign a plain-text message via Freighter's Sign-In With Stellar flow.
 *
 * Freighter v6 `signMessage(message, opts)` returns:
 *   { signedMessage: string | Buffer | null, signerAddress: string, error? }
 *
 * - V3 clients return `signedMessage` as a `Buffer` (raw bytes)
 * - V4+ clients return `signedMessage` as a **base64** string
 * We normalise both to a base64 string so the server can `Buffer.from(sig, "base64")`.
 */
export async function signSignInMessage(message: string): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("Signing is only available in the browser.");
  }

  const result = await signMessage(message);
  if (!result || result.error) {
    throw new Error(
      result?.error?.message || "Wallet rejected the signing request.",
    );
  }
  const sig = result.signedMessage;
  if (!sig) throw new Error("Wallet did not return a signature.");

  // Normalise to base64
  if (typeof sig === "string") return sig;
  // Buffer path (V3): convert to base64
  if (typeof (sig as { toString?: unknown }).toString === "function") {
    return (sig as Buffer).toString("base64");
  }
  throw new Error("Unexpected signature format from wallet.");
}

/**
 * Sign a Stellar transaction XDR. Retained for on-chain escrow flows.
 * V6 returns `{ signedTxXdr, signerAddress, error? }`.
 */
export async function signTransactionXdr(xdr: string): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase: "Test SDF Network ; September 2015",
  });
  if (!result || (result as { error?: unknown }).error) {
    throw new Error(
      (result as { error?: { message?: string } })?.error?.message ||
        "Failed to sign transaction",
    );
  }
  // V6 returns signedTxXdr, older versions returned plain XDR string
  const signed =
    (result as { signedTxXdr?: string }).signedTxXdr ??
    (result as unknown as string);
  if (!signed) throw new Error("Failed to sign transaction");
  return signed;
}

/** Truncate a Stellar public key for display: `GABC...X9K2`. */
export function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

/** Fetch USDC balance via stellarpod-api (falls back to 0.00 on error). */
export async function getBalance(address: string): Promise<string> {
  try {
    const apiUrl =
      typeof process !== "undefined"
        ? process.env.STELLARPOD_API_URL || "http://localhost:3000"
        : "http://localhost:3000";
    const response = await fetch(`${apiUrl}/stellar/balance/${address}`);
    if (!response.ok) return "0.00";
    const data = (await response.json()) as { balance: number };
    return String(data.balance ?? "0.00");
  } catch {
    return "0.00";
  }
}
