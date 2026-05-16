import type { TrendInsightEvalSnapshot } from "~/lib/types";

/**
 * "Is the trend insights feature working?" panel.
 *
 * Reads the latest TrendInsightEvalSnapshot from `GET /trends/insights/eval`
 * and shows the conversion-lift comparison: do designs generated from
 * insights actually sell better than control (random-trend) designs?
 *
 * The numbers here are a PROXY for conversion — we measure
 * "designs-that-got-an-order / total-designs", not "buyers / viewers"
 * (we don't track design page views). The copy makes this explicit so
 * merchants don't misread it as a true funnel rate.
 *
 * Empty states:
 *   * `snapshot === null` — no weekly eval has run yet (feature too new).
 *     Hide the panel entirely. v2 may render a "waiting for first eval"
 *     message but for v1 silence is cleaner.
 *   * `conversionLift === null` — control cohort had 0 conversions
 *     (early-platform: not enough non-insight trend-designs to compare).
 *     Render "insufficient control data" instead of NaN.
 */
export function EvalLiftPanel({
  snapshot,
}: {
  snapshot: TrendInsightEvalSnapshot | null;
}) {
  if (!snapshot) return null;

  const liftLabel = snapshot.conversionLift !== null
    ? `${snapshot.conversionLift.toFixed(2)}x`
    : "—";
  const liftColor =
    snapshot.conversionLift === null
      ? "text-on-surface-variant"
      : snapshot.conversionLift >= 1.5
        ? "text-green-400"
        : snapshot.conversionLift >= 1.2
          ? "text-cyan-300"
          : "text-amber-400";

  const insightRate =
    snapshot.insightDrivenDesigns > 0
      ? (snapshot.insightDrivenOrders / snapshot.insightDrivenDesigns) * 100
      : 0;
  const controlRate =
    snapshot.controlDesigns > 0
      ? (snapshot.controlOrders / snapshot.controlDesigns) * 100
      : 0;

  return (
    <div className="bg-surface-container-low p-6 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
            Insight Lift
          </h3>
          <p className="text-[11px] text-on-surface-variant/60 mt-1">
            Designs from insights vs control · {snapshot.lookbackDays}d
          </p>
        </div>
        <span className="material-symbols-rounded text-cyan-400">analytics</span>
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <span className={`text-4xl font-headline font-extrabold ${liftColor}`}>
          {liftLabel}
        </span>
        <span className="text-xs text-on-surface-variant">conversion lift</span>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <Row
          label="From insights"
          rateLabel={`${insightRate.toFixed(1)}%`}
          subLabel={`${snapshot.insightDrivenOrders}/${snapshot.insightDrivenDesigns} designs`}
          color="bg-cyan-400"
        />
        <Row
          label="Control (random trends)"
          rateLabel={`${controlRate.toFixed(1)}%`}
          subLabel={`${snapshot.controlOrders}/${snapshot.controlDesigns} designs`}
          color="bg-on-surface-variant/40"
        />
      </div>

      {snapshot.conversionLift === null && (
        <p className="text-[11px] text-on-surface-variant/60 mt-4 italic">
          Insufficient control data this window — too few non-insight
          trend-designs to compare yet.
        </p>
      )}

      <p className="text-[11px] text-on-surface-variant/60 mt-4 leading-relaxed">
        "Conversion" here = designs that got ≥1 order / total designs (we
        don't track design page views). Refreshes Monday 05:00 UTC.
      </p>
    </div>
  );
}

function Row({
  label,
  rateLabel,
  subLabel,
  color,
}: {
  label: string;
  rateLabel: string;
  subLabel: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-2 h-8 rounded ${color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-on-surface text-sm">{label}</span>
          <span className="font-mono font-bold text-on-surface">{rateLabel}</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{subLabel}</p>
      </div>
    </div>
  );
}
