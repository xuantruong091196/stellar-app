import {
  isConnected,
  getPublicKey,
  signTransaction,
  setAllowed,
} from "@stellar/freighter-api";

export interface WalletInfo {
  address: string;
  connected: boolean;
}

/**
 * Connect to the Freighter wallet extension.
 */
export async function connectWallet(): Promise<WalletInfo> {
  const connected = await isConnected();
  if (!connected) {
    throw new Error(
      "Freighter wallet extension is not installed. Please install it from https://freighter.app"
    );
  }

  await setAllowed();
  const address = await getPublicKey();

  if (!address) {
    throw new Error("Failed to get wallet address");
  }

  return { address, connected: true };
}

/**
 * Sign a Stellar transaction XDR using Freighter.
 */
export async function signTransactionXdr(xdr: string): Promise<string> {
  const signed = await signTransaction(xdr, {
    networkPassphrase: "Test SDF Network ; September 2015",
  });

  if (!signed) {
    throw new Error("Failed to sign transaction");
  }

  return signed;
}

/**
 * Get the USDC balance for a Stellar address via stellarpod-api.
 */
export async function getBalance(address: string): Promise<string> {
  try {
    const apiUrl = typeof process !== "undefined"
      ? process.env.STELLARPOD_API_URL || "http://localhost:3000"
      : "http://localhost:3000";

    const response = await fetch(`${apiUrl}/stellar/balance/${address}`);
    if (!response.ok) {
      return "0.00";
    }
    const data = (await response.json()) as { balance: number };
    return String(data.balance ?? "0.00");
  } catch {
    return "0.00";
  }
}

/**
 * Check if Freighter extension is available in the browser.
 */
export async function isWalletAvailable(): Promise<boolean> {
  try {
    return await isConnected();
  } catch {
    return false;
  }
}
