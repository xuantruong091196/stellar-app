import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { apiGet, apiPost } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { PlanCard } from "~/components/subscription/PlanCard";

export const meta: MetaFunction = () => pageMeta({ title: "Checkout", noIndex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  const wallet = await requireUser(request);
  const r = await apiGet<{ usdc: { m1: number; m6: number; m12: number }; xlmRate: number | null }>(
    '/subscription/pricing', wallet,
  );
  return json({ pricing: r.data, walletAddress: wallet });
}

export async function action({ request }: ActionFunctionArgs) {
  const wallet = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'quote') {
    const r = await apiPost<{ id: string; amountInCurrency: number; expiresAt: string; xlmRate: number | null }>(
      '/subscription/quote',
      { periodMonths: parseInt(formData.get('periodMonths') as string, 10), currency: formData.get('currency') },
      wallet,
    );
    return r.error ? json({ error: r.error }, { status: r.status || 500 }) : json({ quote: r.data });
  }

  if (intent === 'checkout-custodial') {
    const r = await apiPost<{ id: string; expiresAt: string; txHash: string }>(
      '/subscription/checkout',
      { lockId: formData.get('lockId'), walletMode: 'custodial', buyerEmail: formData.get('buyerEmail') },
      wallet,
    );
    if (r.error) return json({ error: r.error }, { status: r.status || 500 });
    return redirect('/subscription');
  }

  return json({ error: 'Unknown intent' }, { status: 400 });
}

export default function Checkout() {
  const { pricing } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const [period, setPeriod] = useState<1 | 6 | 12>(1);
  const [currency, setCurrency] = useState<'USDC' | 'XLM'>('USDC');
  const [buyerEmail, setBuyerEmail] = useState('');

  const quote = fetcher.data?.quote;

  return (
    <AnimatedPage>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-headline">Upgrade to Premium</h1>

        {fetcher.data?.error && (
          <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl text-sm">
            {fetcher.data.error}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs uppercase font-bold text-on-surface-variant">Pick period</p>
          <div className="grid grid-cols-3 gap-3">
            <PlanCard months={1} priceUsdc={pricing?.usdc.m1 || 19} onSelect={() => setPeriod(1)} selected={period === 1} />
            <PlanCard months={6} priceUsdc={pricing?.usdc.m6 || 97} savingsPct={15} onSelect={() => setPeriod(6)} selected={period === 6} />
            <PlanCard months={12} priceUsdc={pricing?.usdc.m12 || 160} savingsPct={30} onSelect={() => setPeriod(12)} selected={period === 12} />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase font-bold text-on-surface-variant">Pay with</p>
          <div className="flex items-center gap-3">
            {(['USDC', 'XLM'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-5 py-2 rounded-full text-sm font-bold border transition-colors ${
                  currency === c ? 'stellar-gradient text-white border-transparent' : 'bg-surface-container-low border-outline-variant/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {currency === 'XLM' && pricing?.xlmRate && (
            <p className="text-xs text-on-surface-variant">XLM rate: ${pricing.xlmRate.toFixed(4)} (refreshed every 60s)</p>
          )}
        </div>

        {!quote ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="quote" />
            <input type="hidden" name="periodMonths" value={period} />
            <input type="hidden" name="currency" value={currency} />
            <button type="submit" className="w-full px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm">
              Get Quote
            </button>
          </fetcher.Form>
        ) : (
          <div className="space-y-4 bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
            <div>
              <p className="text-xs uppercase font-bold text-on-surface-variant">Locked price</p>
              <p className="text-2xl font-bold font-headline mt-1">
                {quote.amountInCurrency.toFixed(currency === 'USDC' ? 2 : 7)} <span className="text-sm font-mono">{currency}</span>
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Expires: {new Date(quote.expiresAt).toLocaleTimeString()}
              </p>
            </div>

            <fetcher.Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="checkout-custodial" />
              <input type="hidden" name="lockId" value={quote.id} />
              <div>
                <label className="text-xs uppercase font-bold text-on-surface-variant">Email (for buyer wallet)</label>
                <input
                  type="email"
                  name="buyerEmail"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  required
                  className="w-full mt-1 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/10 text-sm"
                  placeholder="your@email.com"
                />
              </div>
              <button type="submit" className="w-full px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm">
                Pay {quote.amountInCurrency.toFixed(currency === 'USDC' ? 2 : 7)} {currency}
              </button>
            </fetcher.Form>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
