import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { NicheSelector } from "~/components/trends/NicheSelector";
import { TrendCard } from "~/components/trends/TrendCard";
import type { Niche, BrowseResult } from "~/lib/trends-types";

export const meta: MetaFunction = () =>
  pageMeta({ title: "Trends", description: "Discover what's trending in your niche", path: "/trends", noIndex: true });

export async function loader({ request }: LoaderFunctionArgs) {
  const wallet = await requireUser(request);
  const url = new URL(request.url);
  const niche = url.searchParams.get('niche') || '';
  const sort = url.searchParams.get('sort') || 'trending';
  const page = url.searchParams.get('page') || '1';

  const nichesRes = await apiGet<{ data: Niche[] }>('/trends/niches', wallet);
  const trendsRes = await apiGet<BrowseResult>(
    `/trends?${new URLSearchParams({ ...(niche ? { niche } : {}), sort, page }).toString()}`,
    wallet,
  );

  return json({
    niches: nichesRes.data?.data || [],
    trends: trendsRes.data?.data || [],
    quotaExceeded: trendsRes.status === 402,
    error: trendsRes.error,
  });
}

export default function Trends() {
  const { niches, trends, quotaExceeded, error } = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const activeNiche = params.get('niche');

  const setNiche = (slug: string | null) => {
    if (slug) params.set('niche', slug);
    else params.delete('niche');
    params.set('page', '1');
    setParams(params);
  };

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">Trends</h1>
          <p className="text-on-surface-variant mt-1">AI-curated trending designs for POD</p>
        </div>

        <NicheSelector niches={niches} active={activeNiche} onChange={setNiche} />

        {quotaExceeded && (
          <div className="bg-amber-500/10 border border-amber-400/20 text-amber-300 px-6 py-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Daily limit reached</p>
              <p className="text-xs opacity-80">Upgrade to Premium for unlimited trends</p>
            </div>
            <a href="/subscription" className="px-4 py-2 rounded-full stellar-gradient text-white text-xs font-bold">
              Upgrade
            </a>
          </div>
        )}
        {error && !quotaExceeded && (
          <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {trends.length === 0 && !quotaExceeded && (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2">trending_flat</span>
            <p>No trends yet. The first run will appear within 24 hours.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {trends.map((t) => <TrendCard key={t.id} trend={t} />)}
        </div>
      </div>
    </AnimatedPage>
  );
}
