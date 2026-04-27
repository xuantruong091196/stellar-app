export function PlanCard({
  months,
  priceUsdc,
  savingsPct,
  onSelect,
  selected,
}: {
  months: 1 | 6 | 12;
  priceUsdc: number;
  savingsPct?: number;
  onSelect: () => void;
  selected: boolean;
}) {
  const monthly = (priceUsdc / months).toFixed(2);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left p-5 rounded-2xl border transition-all ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-outline-variant/10 bg-surface-container-low hover:border-primary/30'
      }`}
    >
      {savingsPct && (
        <span className="absolute -top-2 right-4 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
          Save {savingsPct}%
        </span>
      )}
      <p className="text-xs uppercase font-bold text-on-surface-variant">{months} {months === 1 ? 'month' : 'months'}</p>
      <p className="text-3xl font-bold font-headline mt-1">{priceUsdc} <span className="text-sm font-mono text-on-surface-variant">USDC</span></p>
      <p className="text-xs text-on-surface-variant mt-1">${monthly}/mo</p>
    </button>
  );
}
