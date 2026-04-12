import { useState, useEffect, useCallback } from "react";
import type {
  MetaFunction,
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import { apiGet, apiPatch, apiPost, deriveStoreId } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { WalletConnect } from "~/components/WalletConnect";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { Pill } from "~/components/ui/StatusPill";
import { pageMeta } from "~/lib/seo";

interface StoreSettings {
  id: string;
  storeId: string;
  storeName: string | null;
  locale: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  webhookEnabled: boolean;
  webhookDisabledAt: string | null;
  webhookDisabledReason: string | null;
  defaultMarkup: number;
  notifyOrders: boolean;
  notifyEscrow: boolean;
  notifyShipping: boolean;
  notifyDisputes: boolean;
  notifyProducts: boolean;
  notifySystem: boolean;
  notificationEmail: string | null;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Settings",
    description:
      "Configure your Stelo store — wallet, webhook endpoints, default markup and notification preferences.",
    path: "/settings",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const storeId = deriveStoreId(walletAddress);
  const res = await apiGet<StoreSettings>(`/settings/store/${storeId}`, walletAddress);
  return json({
    walletAddress,
    storeId,
    settings: res.data,
    error: res.error,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const walletAddress = await requireUser(request);
  const storeId = deriveStoreId(walletAddress);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "save") {
    const updates = {
      storeName: formData.get("storeName") as string,
      locale: formData.get("locale") as string,
      webhookUrl: formData.get("webhookUrl") as string || null,
      webhookEnabled: formData.get("webhookEnabled") === "on",
      defaultMarkup: parseFloat(formData.get("defaultMarkup") as string),
      notifyOrders: formData.get("notifyOrders") === "on",
      notifyEscrow: formData.get("notifyEscrow") === "on",
      notifyShipping: formData.get("notifyShipping") === "on",
      notifyDisputes: formData.get("notifyDisputes") === "on",
      notifyProducts: formData.get("notifyProducts") === "on",
      notifySystem: formData.get("notifySystem") === "on",
      notificationEmail: (formData.get("notificationEmail") as string) || null,
      emailEnabled: formData.get("emailEnabled") === "on",
      inAppEnabled: formData.get("inAppEnabled") === "on",
    };
    const res = await apiPatch<StoreSettings>(
      `/settings/store/${storeId}`,
      updates,
      walletAddress,
    );
    return res.error
      ? json({ error: res.error, success: false, secret: null })
      : json({ success: true, error: null, secret: null });
  }

  if (intent === "rotate-secret") {
    const res = await apiPost<{ secret: string }>(
      `/settings/store/${storeId}/webhook/secret`,
      {},
      walletAddress,
    );
    return res.error
      ? json({ error: res.error, success: false, secret: null })
      : json({ success: true, error: null, secret: res.data?.secret || null });
  }

  if (intent === "enable-webhook") {
    const res = await apiPost(
      `/settings/store/${storeId}/webhook/enable`,
      {},
      walletAddress,
    );
    return res.error
      ? json({ error: res.error, success: false, secret: null })
      : json({ success: true, error: null, secret: null });
  }

  return json({ error: "Unknown intent", success: false, secret: null }, { status: 400 });
}

export default function Settings() {
  const { settings: initialSettings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [settings, setSettings] = useState<StoreSettings | null>(initialSettings);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  useEffect(() => {
    if (fetcher.data?.secret) {
      setRevealedSecret(fetcher.data.secret);
    }
  }, [fetcher.data]);

  const isSaving = fetcher.state !== "idle";
  const saved = fetcher.data?.success === true && fetcher.state === "idle";

  const handleWalletAddressChange = useCallback((address: string | null) => {
    setWalletAddress(address);
  }, []);

  const updateField = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  if (!settings) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Configure your Stelo store" />
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p>Failed to load settings.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure your Stelo store" />

      {saved && (
        <div className="bg-green-400/10 border border-green-400/20 text-green-200 px-6 py-4 rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="text-sm font-bold">Settings saved successfully</p>
        </div>
      )}
      {fetcher.data && fetcher.data.error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Error: {fetcher.data.error}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-8">
        <input type="hidden" name="intent" value="save" />

        {/* Wallet Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Stellar Wallet</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Connect your Freighter wallet to manage escrow payments.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <WalletConnect onAddressChange={handleWalletAddressChange} />
            <p className="text-xs text-on-surface-variant pt-2">
              Your wallet signs escrow transactions. Funds are held in USDC on the Stellar network until fulfillment is confirmed.
            </p>
          </div>
        </section>

        {/* Shopify Integration */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Shopify Store</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Connect your Shopify store to publish products and receive orders automatically.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                id="shopify-domain"
                className="ghost-input font-mono text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("shopify-domain") as HTMLInputElement;
                  const shop = input?.value?.trim();
                  if (!shop) return;
                  const domain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;
                  const apiBase = typeof window !== "undefined" ? window.ENV?.PUBLIC_API_URL : "";
                  window.location.href = `${apiBase}/auth/shopify/install?shop=${encodeURIComponent(domain)}`;
                }}
                className="stellar-gradient px-6 py-2.5 rounded-full text-white font-bold text-sm whitespace-nowrap hover:scale-105 active:scale-95 transition-transform"
              >
                Connect Store
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant/60">
              You will be redirected to Shopify to authorize the Stelo app.
            </p>
          </div>
        </section>

        {/* Store Settings */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Store Settings</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Store name and locale preference.
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
                value={settings.storeName || ""}
                onChange={(e) => updateField("storeName", e.target.value)}
                className="ghost-input font-headline text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Language / Ngôn ngữ
              </label>
              <select
                name="locale"
                value={settings.locale}
                onChange={(e) => updateField("locale", e.target.value)}
                className="bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
              >
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </select>
              <p className="text-xs text-on-surface-variant mt-2">
                Used for email notifications.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Notification Email
              </label>
              <input
                type="email"
                name="notificationEmail"
                value={settings.notificationEmail || ""}
                onChange={(e) => updateField("notificationEmail", e.target.value)}
                placeholder="merchant@example.com"
                className="ghost-input font-mono text-sm"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Where to send notification emails. Leave empty to use the email from your Shopify connection.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Pricing</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Default markup applied when creating new products.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm">Platform Fee Rate</span>
              <Pill tone="indigo">5%</Pill>
            </div>
            <div className="h-[1px] bg-outline-variant/20" />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Default Markup %
              </label>
              <input
                type="number"
                name="defaultMarkup"
                value={settings.defaultMarkup}
                onChange={(e) => updateField("defaultMarkup", parseFloat(e.target.value))}
                className="ghost-input font-mono text-lg"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Suggested markup when creating new products.
              </p>
            </div>
          </div>
        </section>

        {/* Notification Channels */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Notification Channels</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              How do you want to receive notifications?
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <Toggle
              name="inAppEnabled"
              label="In-app notifications"
              description="Show in the bell icon and notifications page"
              checked={settings.inAppEnabled}
              onChange={(v) => updateField("inAppEnabled", v)}
            />
            <Toggle
              name="emailEnabled"
              label="Email"
              description="Send to your notification email address"
              checked={settings.emailEnabled}
              onChange={(v) => updateField("emailEnabled", v)}
            />
            <Toggle
              name="webhookEnabled"
              label="Webhook outbound"
              description="POST events to your custom URL (HMAC signed)"
              checked={settings.webhookEnabled}
              onChange={(v) => updateField("webhookEnabled", v)}
            />
          </div>
        </section>

        {/* Notification Categories */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Notification Categories</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Choose which event categories to receive.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <Toggle
              name="notifyOrders"
              label="Orders"
              description="New, cancelled, refunded orders"
              checked={settings.notifyOrders}
              onChange={(v) => updateField("notifyOrders", v)}
            />
            <Toggle
              name="notifyEscrow"
              label="Escrow"
              description="Lock, release, refund, expiry events"
              checked={settings.notifyEscrow}
              onChange={(v) => updateField("notifyEscrow", v)}
            />
            <Toggle
              name="notifyShipping"
              label="Shipping"
              description="Tracking updates and delivery confirmations"
              checked={settings.notifyShipping}
              onChange={(v) => updateField("notifyShipping", v)}
            />
            <Toggle
              name="notifyDisputes"
              label="Disputes"
              description="Dispute opened or resolved"
              checked={settings.notifyDisputes}
              onChange={(v) => updateField("notifyDisputes", v)}
            />
            <Toggle
              name="notifyProducts"
              label="Products"
              description="Product publish success or failure"
              checked={settings.notifyProducts}
              onChange={(v) => updateField("notifyProducts", v)}
            />
            <Toggle
              name="notifySystem"
              label="System"
              description="Webhook auto-disabled and other system events"
              checked={settings.notifySystem}
              onChange={(v) => updateField("notifySystem", v)}
            />
          </div>
        </section>

        {/* Webhook Configuration */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Webhook Configuration</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Receive HMAC-signed POST requests for events.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                name="webhookUrl"
                value={settings.webhookUrl || ""}
                onChange={(e) => updateField("webhookUrl", e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="ghost-input font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Signing Secret
              </label>
              <div className="font-mono text-xs text-on-surface-variant bg-surface-container px-4 py-3 rounded-lg break-all">
                {revealedSecret ? (
                  <span className="text-cyan-300">{revealedSecret}</span>
                ) : (
                  settings.webhookSecret || <span className="text-on-surface-variant/40">Not generated yet</span>
                )}
              </div>
              {revealedSecret && (
                <p className="text-xs text-amber-300 mt-2">
                  Save this secret now. You won&apos;t be able to see it again.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  fetcher.submit({ intent: "rotate-secret" }, { method: "post" });
                }}
                className="mt-3 text-xs font-bold text-primary hover:underline"
              >
                {settings.webhookSecret ? "Rotate secret" : "Generate secret"}
              </button>
            </div>

            {settings.webhookDisabledAt && (
              <div className="bg-red-500/10 border border-red-400/20 px-4 py-3 rounded-lg space-y-2">
                <p className="text-xs font-bold text-red-300">
                  Webhook auto-disabled
                </p>
                <p className="text-xs text-red-200/80">
                  Reason: {settings.webhookDisabledReason || "Too many failures"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    fetcher.submit({ intent: "enable-webhook" }, { method: "post" });
                  }}
                  className="text-xs font-bold text-cyan-300 hover:underline"
                >
                  Re-enable webhook
                </button>
              </div>
            )}

            <div className="pt-2">
              <Link to="/settings/webhooks" className="text-xs font-bold text-primary hover:underline">
                View delivery log →
              </Link>
            </div>
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
