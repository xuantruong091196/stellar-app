import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";

export const meta: MetaFunction = () => pageMeta({ title: "Subscription", noIndex: true });

interface MySub {
  status: string;
  plan?: string;
  periodMonths?: number;
  expiresAt?: string;
  txHash?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const wallet = await requireUser(request);
  const r = await apiGet<MySub>('/subscription/me', wallet);
  return json({ sub: r.data });
}

export default function SubscriptionPage() {
  const { sub } = useLoaderData<typeof loader>();
  const isActive = sub?.status === 'active';

  return (
    <AnimatedPage>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold font-headline">Subscription</h1>

        {isActive ? (
          <div className="bg-surface-container-low rounded-2xl p-6 border border-green-500/20 space-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              Premium Active
            </span>
            <p className="text-2xl font-bold font-headline">Trends Premium</p>
            <p className="text-sm text-on-surface-variant">Unlimited trends + designs</p>
            <p className="text-xs text-on-surface-variant">
              Expires: {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
            </p>
            {sub?.txHash && (
              <a
                href={`https://stellar.expert/explorer/public/tx/${sub.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline font-mono"
              >
                tx: {sub.txHash.slice(0, 12)}...
              </a>
            )}
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 space-y-4">
            <div>
              <p className="text-xs uppercase font-bold text-on-surface-variant">Current plan</p>
              <p className="text-2xl font-bold font-headline">Free</p>
              <p className="text-sm text-on-surface-variant mt-1">5 trends + 3 designs per day</p>
            </div>
            <Link
              to="/subscription/checkout"
              className="block text-center px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
