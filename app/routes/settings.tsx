import { useState, useCallback } from "react";
import type {
  MetaFunction,
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { requireUser } from "~/lib/session.server";
import { WalletConnect } from "~/components/WalletConnect";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { Pill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Settings",
    description:
      "Configure your StellarPOD store — wallet, webhook endpoints, default markup and notification preferences.",
    path: "/settings",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);
  const formData = await request.formData();
  const settings = {
    storeName: formData.get("storeName") as string,
    webhookUrl: formData.get("webhookUrl") as string,
    walletAddress: formData.get("walletAddress") as string | null,
    defaultMarkup: formData.get("defaultMarkup") as string,
    notifyOrders: formData.get("notifyOrders") === "on",
    notifyEscrow: formData.get("notifyEscrow") === "on",
    notifyShipping: formData.get("notifyShipping") === "on",
    notifyDisputes: formData.get("notifyDisputes") === "on",
  };
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
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure your StellarPOD store"
      />

      {saved && (
        <div className="bg-green-400/10 border border-green-400/20 text-green-200 px-6 py-4 rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="text-sm font-bold">Settings saved successfully</p>
        </div>
      )}
      {fetcher.data && !fetcher.data.success && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Failed to save settings</p>
          <p className="text-xs opacity-80">
            {fetcher.data.error || "Unknown error"}
          </p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-8">
        {/* Wallet Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Stellar Wallet</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Connect your Freighter wallet to manage escrow payments on the
              Stellar blockchain.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <WalletConnect onAddressChange={handleWalletAddressChange} />
            <input
              type="hidden"
              name="walletAddress"
              value={walletAddress || ""}
            />
            <p className="text-xs text-on-surface-variant pt-2">
              Your wallet signs escrow transactions. Funds are held in USDC on
              the Stellar network until fulfillment is confirmed.
            </p>
          </div>
        </section>

        {/* Store */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Store Settings</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Configure your store name and integration endpoints.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Store Name
              </label>
              <input
                type="text"
                name="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="ghost-input font-headline text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                name="webhookUrl"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="ghost-input font-mono text-sm"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Optional: receive real-time events for orders & escrow.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Pricing</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Configure pricing defaults. The platform fee is set by
              StellarPOD.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm">Platform Fee Rate</span>
              <Pill tone="indigo">5%</Pill>
            </div>
            <p className="text-xs text-on-surface-variant">
              The platform fee is automatically deducted from every
              transaction and is not configurable.
            </p>
            <div className="h-[1px] bg-outline-variant/20" />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Default Markup %
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="defaultMarkup"
                  value={defaultMarkup}
                  onChange={(e) => setDefaultMarkup(e.target.value)}
                  className="ghost-input font-mono text-lg pr-10"
                />
                <span className="absolute right-0 top-3 text-on-surface-variant font-mono">
                  %
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                Suggested markup when creating new products. Override per
                product.
              </p>
            </div>
            <div className="h-[1px] bg-outline-variant/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm">Currency</span>
              <Pill tone="cyan">USDC / Stellar</Pill>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Notifications</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Choose which events you want to be notified about.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <Toggle
              name="notifyOrders"
              label="New orders"
              description="Get notified when a new order is placed"
              checked={notifyOrders}
              onChange={setNotifyOrders}
            />
            <Toggle
              name="notifyEscrow"
              label="Escrow updates"
              description="Status changes (locked, released, disputed)"
              checked={notifyEscrow}
              onChange={setNotifyEscrow}
            />
            <Toggle
              name="notifyShipping"
              label="Shipping updates"
              description="Tracking information updates"
              checked={notifyShipping}
              onChange={setNotifyShipping}
            />
            <Toggle
              name="notifyDisputes"
              label="Disputes"
              description="When a dispute is opened or resolved"
              checked={notifyDisputes}
              onChange={setNotifyDisputes}
            />
          </div>
        </section>

        <div className="flex items-center justify-end pt-4">
          <Button type="submit" disabled={isSaving} icon="save">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </fetcher.Form>
    </>
  );
}

function Toggle({
  name,
  label,
  description,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-on-surface-variant">{description}</p>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-12 h-7 bg-surface-container-high rounded-full peer-checked:bg-primary/30 transition-colors relative">
          <div
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-transform ${
              checked
                ? "stellar-gradient translate-x-5"
                : "bg-surface-container-highest"
            }`}
          />
        </div>
      </div>
    </label>
  );
}
