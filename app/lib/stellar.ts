import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
} from "@stellar/freighter-api";

export interface WalletInfo {
  address: string;
  connected: boolean;
}

/**
 * Connect to the Freighter wallet extension.
 * Returns the public address of the connected wallet.
 */
export async function connectWallet(): Promise<WalletInfo> {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error(
      "Freighter wallet extension is not installed. Please install it from https://freighter.app"
    );
  }

  await setAllowed();

  const addressResult = await getAddress();
  if (addressResult.error) {
    throw new Error(`Failed to get wallet address: ${addressResult.error}`);
  }

  return {
    address: addressResult.address,
    connected: true,
  };
}

/**
 * Sign a Stellar transaction XDR using Freighter.
 * @param xdr - The transaction XDR string to sign
 * @returns The signed XDR string
 */
export async function signTransactionXdr(xdr: string): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase: "Test SDF Network ; September 2015",
  });

  if (result.error) {
    throw new Error(`Failed to sign transaction: ${result.error}`);
  }

  return result.signedTxXdr;
}

/**
 * Get the USDC balance for a Stellar address.
 * Calls the StellarPOD API which queries the Stellar network.
 * @param address - The Stellar public key
 * @returns The USDC balance as a string
 */
export async function getBalance(address: string): Promise<string> {
  // TODO: Replace with actual API call to stellarpod-api
  // The API wraps Stellar Horizon to fetch the USDC trustline balance
  try {
    const response = await fetch(
      `${import.meta.env.VITE_STELLARPOD_API_URL || "http://localhost:8000"}/api/v1/wallet/${address}/balance`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch balance");
    }
    const data = (await response.json()) as { usdc_balance: string };
    return data.usdc_balance || "0.00";
  } catch {
    console.error("Failed to fetch wallet balance");
    return "0.00";
  }
}

/**
 * Check if Freighter extension is available in the browser.
 */
export async function isWalletAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}
