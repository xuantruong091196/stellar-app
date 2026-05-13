import { Link } from "@remix-run/react";
import type { TrendInsight } from "~/lib/types";
import { EmptyState } from "~/components/ui/PageHeader";

/**
 * "Trending in your niche" dashboard widget.
 *
 * Renders the top-N TrendInsights (default 3) the backend's hourly
 * aggregation cron produces. Each row is a (niche × style × price band)
 * cell with a 0-100 score (decayed by age), and a one-click CTA that hops
 * into the existing trend-design generation flow using the insight's top
 * evidence trend item id.
 *
 * Empty state covers: feature not deployed yet, no insights this window
 * (cold start — first hour after ingest), or all groups below MIN_EVIDENCE.
 */
export function TrendInsightsCard({ insights }: { insights: TrendInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="bg-surface-container-low p-6 rounded-2xl">
        <Heading />
        <EmptyState
          icon="trending_up"
          title="No trends yet"
          description="We're aggregating signals across social platforms and marketplace data. Check back in an hour — the hourly ingest will surface what's hot."
        />
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low p-6 rounded-2xl">
      <Heading />
      <ol className="space-y-3 mt-4">
        {insights.map((insight, idx) => (
          <InsightRow key={insight.id} insight={insight} rank={idx + 1} />
        ))}
      </ol>
      <p className="text-[11px] text-on-surface-variant/70 mt-4 italic">
        Score is 0-100, weighted across social trend volume and stelo.life
        order data, decayed by age. Refreshes hourly.
      </p>
    </div>
  );
}

function Heading() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
          Trending in POD
        </h3>
        <p className="text-[11px] text-on-surface-variant/60 mt-1">
          What's converting across niches this week
        </p>
      </div>
      <span className="material-symbols-rounded text-cyan-400">trending_up</span>
    </div>
  );
}

function InsightRow({ insight, rank }: { insight: TrendInsight; rank: number }) {
  const generateHref = insight.evidenceItemIds[0]
    ? `/trends/${insight.evidenceItemIds[0]}/generate`
    : null;

  const priceBand = `$${insight.priceBandLow.toFixed(0)}–$${insight.priceBandHigh.toFixed(0)}`;
  const scoreColor =
    insight.score >= 70
      ? "text-green-400"
      : insight.score >= 40
        ? "text-cyan-300"
        : "text-on-surface-variant";

  return (
    <li className="group relative bg-surface-bright hover:bg-surface-container rounded-xl px-4 py-3 transition-colors">
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono font-bold text-on-surface-variant/60 w-5 shrink-0">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-sm text-on-surface capitalize">
              {insight.niche}
            </span>
            <span className="text-on-surface-variant/60">·</span>
            <span className="text-sm text-on-surface-variant capitalize">
              {insight.styleTag}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-on-surface-variant/80">
            <span className="font-mono">{priceBand}</span>
            <span className="text-on-surface-variant/40">·</span>
            <span className={`font-mono font-bold ${scoreColor}`}>
              {insight.score.toFixed(0)}
            </span>
          </div>
          {insight.topEvidenceKeyword && (
            <p className="text-[11px] text-on-surface-variant/60 mt-1 italic truncate">
              e.g. "{insight.topEvidenceKeyword}"
            </p>
          )}
        </div>
        {generateHref && (
          <Link
            to={generateHref}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Generate
            <span className="material-symbols-rounded text-base">arrow_forward</span>
          </Link>
        )}
      </div>
    </li>
  );
}
