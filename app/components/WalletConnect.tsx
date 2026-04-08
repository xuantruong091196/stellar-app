import { useState, useCallback } from "react";
import { Button, Badge, BlockStack, InlineStack, Text, Banner } from "@shopify/polaris";

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

export function WalletConnect({ onAddressChange }: WalletConnectProps = {}) {
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
      // Dynamic import to avoid SSR issues with Freighter
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
  }, []);

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

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-6)}`;

  return (
    <BlockStack gap="300">
      {wallet.error && (
        <Banner tone="critical" onDismiss={() => setWallet((prev) => ({ ...prev, error: null }))}>
          <p>{wallet.error}</p>
        </Banner>
      )}

      {wallet.connected && wallet.address ? (
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <Badge tone="success">Connected</Badge>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {truncateAddress(wallet.address)}
              </Text>
            </InlineStack>
            <Button variant="plain" tone="critical" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </InlineStack>

          {wallet.balance !== null && (
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodySm" tone="subdued">Balance:</Text>
              <Text as="span" variant="bodyMd" fontWeight="bold">
                {wallet.balance} USDC
              </Text>
            </InlineStack>
          )}

          <Text as="p" variant="bodySm" tone="subdued">
            Full address: {wallet.address}
          </Text>
        </BlockStack>
      ) : (
        <BlockStack gap="200">
          <Button
            variant="primary"
            onClick={handleConnect}
            loading={wallet.loading}
          >
            Connect Freighter Wallet
          </Button>
          <Text as="p" variant="bodySm" tone="subdued">
            Connect your Stellar wallet using the Freighter browser extension.
          </Text>
        </BlockStack>
      )}
    </BlockStack>
  );
}
