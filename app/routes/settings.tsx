import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  TextField,
  Checkbox,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Divider,
  Box,
} from "@shopify/polaris";
import type { MetaFunction } from "@remix-run/node";
import { WalletConnect } from "~/components/WalletConnect";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Settings" }];
};

export default function Settings() {
  const [storeName, setStoreName] = useState("My Stellar Store");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyEscrow, setNotifyEscrow] = useState(true);
  const [notifyShipping, setNotifyShipping] = useState(true);
  const [notifyDisputes, setNotifyDisputes] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    // TODO: Call API to save settings
    console.log("Saving settings:", {
      storeName,
      webhookUrl,
      notifications: { notifyOrders, notifyEscrow, notifyShipping, notifyDisputes },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [storeName, webhookUrl, notifyOrders, notifyEscrow, notifyShipping, notifyDisputes]);

  return (
    <Page title="Settings" subtitle="Manage your StellarPOD store configuration">
      <BlockStack gap="500">
        {saved && (
          <Banner title="Settings saved" tone="success" onDismiss={() => setSaved(false)}>
            <p>Your settings have been saved successfully.</p>
          </Banner>
        )}

        <Layout>
          <Layout.AnnotatedSection
            title="Stellar Wallet"
            description="Connect your Freighter wallet to manage escrow payments on the Stellar blockchain."
          >
            <Card>
              <BlockStack gap="400">
                <WalletConnect />
                <Divider />
                <Text as="p" variant="bodySm" tone="subdued">
                  Your wallet is used to sign escrow transactions. Funds are held in
                  USDC on the Stellar network until order fulfillment is confirmed.
                </Text>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            title="Store Settings"
            description="Configure your store name and integration endpoints."
          >
            <Card>
              <BlockStack gap="400">
                <TextField
                  label="Store Name"
                  value={storeName}
                  onChange={setStoreName}
                  autoComplete="off"
                />
                <TextField
                  label="Webhook URL"
                  value={webhookUrl}
                  onChange={setWebhookUrl}
                  autoComplete="off"
                  placeholder="https://your-server.com/webhook"
                  helpText="Optional: Receive real-time notifications for order and escrow events."
                />
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>

          <Layout.AnnotatedSection
            title="Notifications"
            description="Choose which events you want to be notified about."
          >
            <Card>
              <BlockStack gap="300">
                <Checkbox
                  label="New orders"
                  helpText="Get notified when a new order is placed"
                  checked={notifyOrders}
                  onChange={setNotifyOrders}
                />
                <Checkbox
                  label="Escrow updates"
                  helpText="Get notified when escrow status changes (locked, released, disputed)"
                  checked={notifyEscrow}
                  onChange={setNotifyEscrow}
                />
                <Checkbox
                  label="Shipping updates"
                  helpText="Get notified when tracking information is updated"
                  checked={notifyShipping}
                  onChange={setNotifyShipping}
                />
                <Checkbox
                  label="Disputes"
                  helpText="Get notified when a dispute is opened or resolved"
                  checked={notifyDisputes}
                  onChange={setNotifyDisputes}
                />
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        <Box paddingBlockStart="400">
          <InlineStack align="end">
            <Button variant="primary" onClick={handleSave}>
              Save Settings
            </Button>
          </InlineStack>
        </Box>
      </BlockStack>
    </Page>
  );
}
