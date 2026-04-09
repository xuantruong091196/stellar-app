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
  Badge,
} from "@shopify/polaris";
import type { MetaFunction, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { WalletConnect } from "~/components/WalletConnect";

export const meta: MetaFunction = () => {
  return [{ title: "StellarPOD - Settings" }];
};

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const settings = {
    storeName: formData.get("storeName") as string,
    webhookUrl: formData.get("webhookUrl") as string,
    walletAddress: formData.get("walletAddress") as string | null,
    notifyOrders: formData.get("notifyOrders") === "on",
    notifyEscrow: formData.get("notifyEscrow") === "on",
    notifyShipping: formData.get("notifyShipping") === "on",
    notifyDisputes: formData.get("notifyDisputes") === "on",
  };

  // TODO: Save settings via API when the store update endpoint is available
  // e.g. await apiPatch(`/stores/${storeId}`, settings);
  console.log("Settings received:", settings);

  return json({ success: true, error: null });
}

export default function Settings() {
  const fetcher = useFetcher<typeof action>();
  const [storeName, setStoreName] = useState("My Stellar Store");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [defaultMarkup, setDefaultMarkup] = useState("30");
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyEscrow, setNotifyEscrow] = useState(true);
  const [notifyShipping, setNotifyShipping] = useState(true);
  const [notifyDisputes, setNotifyDisputes] = useState(true);

  const isSaving = fetcher.state !== "idle";
  const saved = fetcher.data?.success === true && fetcher.state === "idle";

  const handleWalletAddressChange = useCallback((address: string | null) => {
    setWalletAddress(address);
  }, []);

  return (
    <Page title="Settings" subtitle="Manage your StellarPOD store configuration">
      <fetcher.Form method="post">
        <BlockStack gap="500">
          {saved && (
            <Banner title="Settings saved" tone="success">
              <p>Your settings have been saved successfully.</p>
            </Banner>
          )}

          {fetcher.data && !fetcher.data.success && (
            <Banner title="Failed to save settings" tone="critical">
              <p>{fetcher.data.error || "An unknown error occurred."}</p>
            </Banner>
          )}

          <Layout>
            <Layout.AnnotatedSection
              title="Stellar Wallet"
              description="Connect your Freighter wallet to manage escrow payments on the Stellar blockchain."
            >
              <Card>
                <BlockStack gap="400">
                  <WalletConnect onAddressChange={handleWalletAddressChange} />
                  <input type="hidden" name="walletAddress" value={walletAddress || ""} />
                  <Divider />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Your wallet is used to sign escrow transactions. Funds are held in
                    USDC on the Stellar network until order fulfillment is confirmed.
                    {walletAddress ? " Your connected wallet address will be saved with your settings." : ""}
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
                    name="storeName"
                    value={storeName}
                    onChange={setStoreName}
                    autoComplete="off"
                  />
                  <TextField
                    label="Webhook URL"
                    name="webhookUrl"
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
              title="Pricing"
              description="Configure pricing defaults for your products. The platform fee is set by StellarPOD."
            >
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd">Platform Fee Rate</Text>
                    <Badge tone="info">5%</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    The platform fee is automatically deducted from each transaction and is not configurable.
                  </Text>
                  <Divider />
                  <TextField
                    label="Default Markup Percentage"
                    name="defaultMarkup"
                    type="number"
                    value={defaultMarkup}
                    onChange={setDefaultMarkup}
                    autoComplete="off"
                    suffix="%"
                    helpText="Suggested markup applied when creating new products. You can override per product."
                  />
                  <Divider />
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd">Currency</Text>
                    <Badge>USDC (Stellar)</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    All transactions are settled in USDC on the Stellar network. Prices displayed to customers use USD equivalent.
                  </Text>
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
                    name="notifyOrders"
                    helpText="Get notified when a new order is placed"
                    checked={notifyOrders}
                    onChange={setNotifyOrders}
                  />
                  <Checkbox
                    label="Escrow updates"
                    name="notifyEscrow"
                    helpText="Get notified when escrow status changes (locked, released, disputed)"
                    checked={notifyEscrow}
                    onChange={setNotifyEscrow}
                  />
                  <Checkbox
                    label="Shipping updates"
                    name="notifyShipping"
                    helpText="Get notified when tracking information is updated"
                    checked={notifyShipping}
                    onChange={setNotifyShipping}
                  />
                  <Checkbox
                    label="Disputes"
                    name="notifyDisputes"
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
              <Button variant="primary" submit loading={isSaving}>
                Save Settings
              </Button>
            </InlineStack>
          </Box>

          <Box paddingBlockEnd="400">
            <Text as="p" variant="bodySm" tone="subdued">
              Settings saved: store name, webhook URL, notification preferences, and connected wallet address.
              Store update API endpoint is pending -- settings are logged server-side for now.
            </Text>
          </Box>
        </BlockStack>
      </fetcher.Form>
    </Page>
  );
}
