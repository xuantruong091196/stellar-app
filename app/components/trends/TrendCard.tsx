import { Link } from "@remix-run/react";
import { CopyrightWarning } from "./CopyrightWarning";
import type { TrendItem } from "~/lib/trends-types";

export function TrendCard({ trend }: { trend: TrendItem }) {
  const palette = trend.styleRefs?.[0]?.palette?.slice(0, 3) || [];
  return (
    <Link
      to={`/trends/${trend.id}`}
      className="block bg-surface-container-low rounded-xl border border-outline-variant/10 p-5 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[10px] font-mono uppercase text-on-surface-variant">
          {trend.source.toLowerCase().replace('_', ' ')}
        </span>
        <CopyrightWarning risk={trend.copyrightRisk} flags={trend.copyrightFlags} />
      </div>

      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-3 mb-4">
        {trend.keyword}
      </p>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide font-bold text-on-surface-variant mb-3">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">storefront</span>
          {trend.sellabilityScore}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">whatshot</span>
          {trend.viralityScore}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">brush</span>
          {trend.visualPotential}
        </span>
      </div>

      {palette.length > 0 && (
        <div className="flex items-center gap-1">
          {palette.map((hex) => (
            <div key={hex} className="w-5 h-5 rounded-full border border-outline-variant/20" style={{ background: hex }} />
          ))}
        </div>
      )}
    </Link>
  );
}
