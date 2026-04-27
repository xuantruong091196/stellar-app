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

  // Step 1: Lock price for 15 minutes
  if (intent === 'quote') {
    const r = await apiPost<{ id: string; amountInCurrency: number; expiresAt: string; xlmRate: number | null }>(
      '/subscription/quote',
      { periodMonths: parseInt(formData.get('periodMonths') as string, 10), currency: formData.get('currency') },
      wallet,
    );
    return r.error ? json({ error: r.error }, { status: r.status || 500 }) : json({ quote: r.data });
  }

  // Step 2: Server builds payment XDR for buyer's Stellar address
  if (intent === 'prepare-xdr') {
    const r = await apiPost<{ xdr: string; lockId: string }>(
      '/subscription/checkout',
      {
        lockId: formData.get('lockId'),
        walletMode: 'freighter',
        sourceAddress: formData.get('sourceAddress'),
      },
      wallet,
    );
    return r.error ? json({ error: r.error }, { status: r.status || 500 }) : json({ xdrPayload: r.data });
  }

  // Step 3: Submit signed XDR to activate subscription
  if (intent === 'confirm') {
    const r = await apiPost<{ id: string; expiresAt: string; txHash: string }>(
      '/subscription/checkout/confirm',
      { lockId: formData.get('lockId'), signedXdr: formData.get('signedXdr') },
      wallet,
    );
    if (r.error) return json({ error: r.error }, { status: r.status || 500 });
    return redirect('/subscription');
  }

  return json({ error: 'Unknown intent' }, { status: 400 });
}

type CheckoutStage = 'pick' | 'quoted' | 'connecting' | 'signing' | 'submitting';

export default function Checkout() {
  const { pricing } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const [period, setPeriod] = useState<1 | 6 | 12>(1);
  const [currency, setCurrency] = useState<'USDC' | 'XLM'>('USDC');
  const [stage, setStage] = useState<CheckoutStage>('pick');
  const [sourceAddress, setSourceAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quote = fetcher.data?.quote;
  const submitting = fetcher.state === 'submitting';

  // Connect Freighter wallet, get user's Stellar address
  const connectFreighter = async (): Promise<string> => {
    const { connectWallet, isWalletAvailable } = await import('~/lib/stellar');
    const available = await isWalletAvailable();
    if (!available) {
      throw new Error('Freighter not detected. Install: https://freighter.app');
    }
    const info = await connectWallet();
    if (!info?.address) throw new Error('Could not get wallet address');
    return info.address;
  };

  // Pay flow: prepare XDR → sign → submit
  const handlePay = async () => {
    if (!quote) return;
    setError(null);

    try {
      // 1. Connect Freighter (if not already connected)
      setStage('connecting');
      const addr = sourceAddress || (await connectFreighter());
      setSourceAddress(addr);

      // 2. Ask backend for unsigned XDR (does NOT consume lock yet)
      const prepFd = new FormData();
      prepFd.set('intent', 'prepare-xdr');
      prepFd.set('lockId', quote.id);
      prepFd.set('sourceAddress', addr);
      const prepRes = await fetch('/subscription/checkout', { method: 'POST', body: prepFd });
      const prepData = await prepRes.json();
      if (prepData.error) throw new Error(prepData.error);
      const { xdr } = prepData.xdrPayload;

      // 3. Sign XDR via Freighter
      setStage('signing');
      const { signTransactionXdr } = await import('~/lib/stellar');
      const signed = await signTransactionXdr(xdr);
      if (!signed) throw new Error('Signing cancelled');

      // 4. Submit signed XDR (consumes lock + activates subscription)
      setStage('submitting');
      const confirmFd = new FormData();
      confirmFd.set('intent', 'confirm');
      confirmFd.set('lockId', quote.id);
      confirmFd.set('signedXdr', signed);
      fetcher.submit(confirmFd, { method: 'post' });
    } catch (err) {
      setError((err as Error).message || 'Payment failed');
      setStage('quoted');
    }
  };

  return (
    <AnimatedPage>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-headline">Upgrade to Premium</h1>

        {(error || fetcher.data?.error) && (
          <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl text-sm">
            {error || fetcher.data?.error}
          </div>
        )}

        {!quote ? (
          <>
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

            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="quote" />
              <input type="hidden" name="periodMonths" value={period} />
              <input type="hidden" name="currency" value={currency} />
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm disabled:opacity-50"
              >
                {submitting ? 'Getting quote…' : 'Get Quote'}
              </button>
            </fetcher.Form>
          </>
        ) : (
          <div className="space-y-4 bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
            <div>
              <p className="text-xs uppercase font-bold text-on-surface-variant">Locked price ({period} {period === 1 ? 'month' : 'months'})</p>
              <p className="text-2xl font-bold font-headline mt-1">
                {quote.amountInCurrency.toFixed(currency === 'USDC' ? 2 : 7)}{' '}
                <span className="text-sm font-mono">{currency}</span>
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Expires at {new Date(quote.expiresAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="bg-surface-container-high rounded-xl p-3 text-xs text-on-surface-variant space-y-1">
              <p className="font-bold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                Pay with Freighter wallet
              </p>
              <p>You'll sign the transaction in Freighter. The exact amount, currency, and destination are verified on-chain before activation.</p>
              {sourceAddress && (
                <p className="font-mono text-[10px] mt-2">
                  Connected: {sourceAddress.slice(0, 6)}…{sourceAddress.slice(-6)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={stage !== 'pick' && stage !== 'quoted'}
              className="w-full px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {stage === 'connecting' && (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Connecting Freighter…
                </>
              )}
              {stage === 'signing' && (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Sign in Freighter…
                </>
              )}
              {stage === 'submitting' && (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Submitting to Stellar…
                </>
              )}
              {(stage === 'pick' || stage === 'quoted') && (
                <>Pay {quote.amountInCurrency.toFixed(currency === 'USDC' ? 2 : 7)} {currency}</>
              )}
            </button>

            <a
              href="https://freighter.app"
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs text-on-surface-variant hover:text-primary"
            >
              Don't have Freighter? Install →
            </a>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
