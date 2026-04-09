import { useState, useCallback } from "react";
import { Button } from "~/components/ui/Button";

interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  loading: boolean;
  error: string | null;
}

interface WalletConnectProps {
  onAddressChange?: (address: string | null) => void;
}

export function WalletConnect({
  onAddressChange,
}: WalletConnectProps = {}) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: null,
    loading: false,
    error: null,
  });

  const handleConnect = useCallback(async () => {
    setWallet((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { connectWallet, getBalance } = await import("~/lib/stellar");
      const walletInfo = await connectWallet();
      const balance = await getBalance(walletInfo.address);
      setWallet({
        connected: true,
        address: walletInfo.address,
        balance,
        loading: false,
        error: null,
      });
      onAddressChange?.(walletInfo.address);
    } catch (err) {
      setWallet((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to connect wallet",
      }));
    }
  }, [onAddressChange]);

  const handleDisconnect = useCallback(() => {
    setWallet({
      connected: false,
      address: null,
      balance: null,
      loading: false,
      error: null,
    });
    onAddressChange?.(null);
  }, [onAddressChange]);

  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-6)}`;

  if (wallet.error) {
    return (
      <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl">
        <p className="text-sm">{wallet.error}</p>
        <button
          type="button"
          onClick={() =>
            setWallet((prev) => ({ ...prev, error: null }))
          }
          className="text-xs underline mt-1"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (wallet.connected && wallet.address) {
    return (
      <div className="space-y-4">
        <div className="bg-surface-container p-5 rounded-2xl stellar-gradient">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/60 font-bold">
                Connected Wallet
              </p>
              <p className="font-mono text-white text-lg font-bold mt-1">
                {truncate(wallet.address)}
              </p>
            </div>
            <span className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-white/30">
              Active
            </span>
          </div>
          {wallet.balance !== null && (
            <p className="text-white font-mono font-bold text-2xl mt-3">
              {wallet.balance}{" "}
              <span className="text-cyan-200 text-sm">USDC</span>
            </p>
          )}
          <p className="text-white/60 text-[10px] font-mono mt-2 break-all">
            {wallet.address}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="text-xs font-bold text-red-400 hover:underline"
        >
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleConnect}
        disabled={wallet.loading}
        icon="account_balance_wallet"
      >
        {wallet.loading ? "Connecting..." : "Connect Freighter Wallet"}
      </Button>
      <p className="text-xs text-on-surface-variant">
        Connect your Stellar wallet using the Freighter browser extension.
      </p>
    </div>
  );
}
