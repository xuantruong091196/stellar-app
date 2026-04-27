import type { Niche } from "~/lib/trends-types";

export function NicheSelector({
  niches,
  active,
  onChange,
}: {
  niches: Niche[];
  active: string | null;
  onChange: (slug: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
          active === null
            ? "stellar-gradient text-white"
            : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
        }`}
      >
        All Niches
      </button>
      {niches.map((n) => (
        <button
          key={n.slug}
          type="button"
          onClick={() => onChange(n.slug)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${
            active === n.slug
              ? "stellar-gradient text-white"
              : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span>{n.emoji}</span>
          <span>{n.name}</span>
        </button>
      ))}
    </div>
  );
}
