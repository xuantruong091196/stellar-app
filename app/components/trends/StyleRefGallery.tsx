export function StyleRefGallery({ refs }: { refs: Array<{ imageUrl: string; palette: string[]; styleTags: string[] }> }) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">Style References</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {refs.slice(0, 10).map((r, i) => (
          <div key={i} className="aspect-square rounded-lg overflow-hidden border border-outline-variant/10">
            <img src={r.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {[...new Set(refs.flatMap((r) => r.palette))].slice(0, 6).map((hex) => (
          <div key={hex} className="w-6 h-6 rounded-full border border-outline-variant/20" style={{ background: hex }} title={hex} />
        ))}
      </div>
    </div>
  );
}
