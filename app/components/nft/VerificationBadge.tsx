export function VerificationBadge({ status }: { status: string }) {
  if (status === 'MINTED' || status === 'TRANSFERRED') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-400/20">
        <span className="material-symbols-outlined text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
        <span className="text-green-400 font-bold text-sm uppercase tracking-wider">Authentic</span>
      </div>
    );
  }
  if (status === 'BURNED') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-400/20">
        <span className="material-symbols-outlined text-amber-400">local_fire_department</span>
        <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Burned — Redeemed</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-400/20">
      <span className="material-symbols-outlined text-red-400">error</span>
      <span className="text-red-400 font-bold text-sm uppercase tracking-wider">Not Found</span>
    </div>
  );
}
