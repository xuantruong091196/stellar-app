import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { api } from "~/lib/api";
import { PageHeader } from "~/components/ui/PageHeader";
import { Button } from "~/components/ui/Button";
import { pageMeta } from "~/lib/seo";

interface ProviderSettings {
  id: string;
  providerId: string;
  locale: string;
  webhookUrl: string | null;
  webhookSecret: string | null;
  webhookEnabled: boolean;
  webhookDisabledAt: string | null;
  notifyNewOrders: boolean;
  notifyOrderCancelled: boolean;
  notifyEscrowReleased: boolean;
  notifyDisputes: boolean;
  notifySystem: boolean;
  notificationEmail: string | null;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Provider Settings",
    description: "Configure your provider account — notifications, webhooks, payout preferences.",
    path: "/provider/settings",
    noIndex: true,
  });

export async function loader({ request }: LoaderFunctionArgs) {
  // Provider auth comes from a session token stored in cookie or local storage
  // For now, we expect a `provider_token` cookie
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/provider_token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token) {
    return redirect("/provider-onboarding");
  }

  // We need to fetch the provider's own settings — but we don't know providerId from cookie alone.
  // The API endpoint /settings/provider/me would be cleaner, but we'll use the token to fetch
  // the provider's profile first.
  return json({ token, settings: null as ProviderSettings | null, error: null });
}

export async function action({ request }: ActionFunctionArgs) {
  const cookie = request.headers.get("cookie") || "";
  const tokenMatch = cookie.match(/provider_token=([^;]+)/);
  const token = tokenMatch?.[1];
  if (!token) return json({ error: "Not authenticated" }, { status: 401 });

  const formData = await request.formData();
  const providerId = formData.get("providerId") as string;
  if (!providerId) return json({ error: "Missing providerId" }, { status: 400 });

  const updates: Record<string, unknown> = {
    locale: formData.get("locale"),
    webhookUrl: formData.get("webhookUrl") || null,
    webhookEnabled: formData.get("webhookEnabled") === "on",
    notifyNewOrders: formData.get("notifyNewOrders") === "on",
    notifyOrderCancelled: formData.get("notifyOrderCancelled") === "on",
    notifyEscrowReleased: formData.get("notifyEscrowReleased") === "on",
    notifyDisputes: formData.get("notifyDisputes") === "on",
    notifySystem: formData.get("notifySystem") === "on",
    notificationEmail: formData.get("notificationEmail") || null,
    emailEnabled: formData.get("emailEnabled") === "on",
    inAppEnabled: formData.get("inAppEnabled") === "on",
  };

  const res = await api(`/settings/provider/${providerId}`, {
    method: "PATCH",
    body: updates,
    token,
  });

  return res.error
    ? json({ success: false, error: res.error })
    : json({ success: true, error: null });
}

export default function ProviderSettings() {
  const { token } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch settings on mount (need providerId from token)
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        // Decode JWT to get providerId (simple base64 decode of payload)
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          const id = payload.sub as string;
          if (cancelled) return;
          setProviderId(id);

          const apiBase =
            (typeof window !== "undefined" && window.ENV?.PUBLIC_API_URL) ||
            "http://localhost:8000";
          const res = await fetch(`${apiBase}/settings/provider/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cancelled) return;
          if (res.ok) {
            const data = await res.json();
            setSettings(data);
          }
        }
      } catch (err) {
        console.error("Failed to load provider settings:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const updateField = <K extends keyof ProviderSettings>(key: K, value: ProviderSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Provider Settings" subtitle="Loading..." />
      </>
    );
  }

  if (!settings || !providerId) {
    return (
      <>
        <PageHeader title="Provider Settings" />
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p>Failed to load settings. Please re-login.</p>
        </div>
      </>
    );
  }

  const isSaving = fetcher.state !== "idle";
  const saved =
    fetcher.data && "success" in fetcher.data && fetcher.data.success === true && fetcher.state === "idle";
  const errorMessage =
    fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  return (
    <>
      <PageHeader title="Provider Settings" subtitle="Manage your notifications and webhooks" />

      {saved && (
        <div className="bg-green-400/10 border border-green-400/20 text-green-200 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Settings saved successfully</p>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          <p className="text-sm font-bold">Error: {errorMessage}</p>
        </div>
      )}

      <fetcher.Form method="post" className="space-y-8">
        <input type="hidden" name="providerId" value={providerId} />

        {/* Locale + email */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">General</h2>
            <p className="text-sm text-on-surface-variant mt-2">Language and notification email.</p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-6">
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
                placeholder="provider@example.com"
                className="ghost-input font-mono text-sm"
              />
            </div>
          </div>
        </section>

        {/* Channels */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Notification Channels</h2>
            <p className="text-sm text-on-surface-variant mt-2">How to receive notifications.</p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <Toggle
              name="inAppEnabled"
              label="In-app notifications"
              description="Show in your provider dashboard"
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
              label="Webhook"
              description="POST events to your custom URL"
              checked={settings.webhookEnabled}
              onChange={(v) => updateField("webhookEnabled", v)}
            />
          </div>
        </section>

        {/* Categories */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Event Categories</h2>
            <p className="text-sm text-on-surface-variant mt-2">Which events to receive.</p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <Toggle
              name="notifyNewOrders"
              label="New orders"
              description="When a new order is assigned to you"
              checked={settings.notifyNewOrders}
              onChange={(v) => updateField("notifyNewOrders", v)}
            />
            <Toggle
              name="notifyOrderCancelled"
              label="Order cancelled"
              description="When an order is cancelled before fulfillment"
              checked={settings.notifyOrderCancelled}
              onChange={(v) => updateField("notifyOrderCancelled", v)}
            />
            <Toggle
              name="notifyEscrowReleased"
              label="Payment received"
              description="When escrow is released to your wallet"
              checked={settings.notifyEscrowReleased}
              onChange={(v) => updateField("notifyEscrowReleased", v)}
            />
            <Toggle
              name="notifyDisputes"
              label="Disputes"
              description="When a merchant raises a dispute"
              checked={settings.notifyDisputes}
              onChange={(v) => updateField("notifyDisputes", v)}
            />
            <Toggle
              name="notifySystem"
              label="System events"
              description="Webhook auto-disabled, system maintenance"
              checked={settings.notifySystem}
              onChange={(v) => updateField("notifySystem", v)}
            />
          </div>
        </section>

        {/* Webhook config */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h2 className="text-lg font-bold font-headline">Webhook URL</h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Receive events at your custom endpoint.
            </p>
          </div>
          <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                URL
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
            {settings.webhookSecret && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Secret
                </label>
                <code className="font-mono text-xs text-cyan-300 bg-surface-container px-3 py-2 rounded-lg">
                  {settings.webhookSecret}
                </code>
              </div>
            )}
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
              checked ? "stellar-gradient translate-x-5" : "bg-surface-container-highest"
            }`}
          />
        </div>
      </div>
    </label>
  );
}
