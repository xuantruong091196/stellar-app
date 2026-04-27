import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { apiGet } from "~/lib/api";
import { requireUser } from "~/lib/session.server";
import { pageMeta } from "~/lib/seo";
import { AnimatedPage } from "~/components/ui/AnimatedPage";
import { CopyrightWarning } from "~/components/trends/CopyrightWarning";
import { StyleRefGallery } from "~/components/trends/StyleRefGallery";
import type { TrendItem } from "~/lib/trends-types";

export const meta: MetaFunction = () => pageMeta({ title: "Trend Detail", noIndex: true });

export async function loader({ request, params }: LoaderFunctionArgs) {
  const wallet = await requireUser(request);
  const trendRes = await apiGet<TrendItem>(`/trends/${params.trendId}`, wallet);
  const similarRes = await apiGet<{ data: Array<{ id: string; keyword: string; niche: string }> }>(
    `/trends/${params.trendId}/similar`, wallet,
  );
  return json({
    trend: trendRes.data,
    similar: similarRes.data?.data || [],
    error: trendRes.error,
  });
}

export default function TrendDetail() {
  const { trend, similar, error } = useLoaderData<typeof loader>();
  if (error || !trend) {
    return (
      <AnimatedPage>
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
          {error || 'Trend not found'}
        </div>
      </AnimatedPage>
    );
  }

  const blocked = trend.copyrightRisk === 'BLOCKED';

  return (
    <AnimatedPage>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/trends" className="text-sm text-on-surface-variant hover:text-primary inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to trends
        </Link>

        <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[10px] font-mono uppercase text-on-surface-variant">{trend.source}</p>
              <h1 className="text-2xl font-bold font-headline">{trend.keyword}</h1>
              {trend.fullText && trend.fullText !== trend.keyword && (
                <p className="text-sm text-on-surface-variant">{trend.fullText}</p>
              )}
            </div>
            <CopyrightWarning risk={trend.copyrightRisk} flags={trend.copyrightFlags} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sellability', value: trend.sellabilityScore },
              { label: 'Virality', value: trend.viralityScore },
              { label: 'Visual Potential', value: trend.visualPotential },
            ].map((m) => (
              <div key={m.label} className="bg-surface-container-high rounded-xl p-3 text-center">
                <p className="text-2xl font-bold font-headline text-primary">{m.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">{m.label}</p>
              </div>
            ))}
          </div>

          {trend.emotionTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {trend.emotionTags.map((t) => (
                <span key={t} className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {t}
                </span>
              ))}
            </div>
          )}

          {trend.copyrightRisk === 'MEDIUM' && trend.copyrightSearchHits && trend.copyrightSearchHits.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-bold text-amber-400">Possible copyright matches found:</p>
              {trend.copyrightSearchHits.slice(0, 3).map((h) => (
                <a key={h.link} href={h.link} target="_blank" rel="noreferrer" className="block text-on-surface-variant hover:text-amber-400 truncate">
                  → {h.title}
                </a>
              ))}
            </div>
          )}

          {trend.styleRefs && <StyleRefGallery refs={trend.styleRefs} />}

          {!blocked ? (
            <Link
              to={`/trends/${trend.id}/generate`}
              className="block w-full text-center px-6 py-3 rounded-full stellar-gradient text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Generate Design from this Trend
            </Link>
          ) : (
            <div className="text-center py-3 text-red-400 text-sm font-bold">
              This trend is blocked due to copyright concerns
            </div>
          )}
        </div>

        {similar.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Similar Trends</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  to={`/trends/${s.id}`}
                  className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10 hover:border-primary/30 transition-colors"
                >
                  <p className="text-xs uppercase text-on-surface-variant mb-1">{s.niche}</p>
                  <p className="text-sm font-bold line-clamp-2">{s.keyword}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
