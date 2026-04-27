export function CopyrightWarning({ risk, flags }: { risk: string; flags: string[] }) {
  if (risk === 'LOW') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
        <span className="material-symbols-outlined text-[12px]">check_circle</span>
        Safe
      </span>
    );
  }
  if (risk === 'MEDIUM') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20" title={flags.join(', ')}>
        <span className="material-symbols-outlined text-[12px]">warning</span>
        Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20" title={flags.join(', ')}>
      <span className="material-symbols-outlined text-[12px]">block</span>
      Risky
    </span>
  );
}
