const STAGES: Record<string, { label: string; pct: number }> = {
  PENDING: { label: 'Queued...', pct: 5 },
  GENERATING: { label: 'Generating with AI...', pct: 35 },
  UPSCALING: { label: 'Upscaling for print...', pct: 70 },
  COMPOSITING: { label: 'Finalizing...', pct: 95 },
  COMPLETED: { label: 'Done!', pct: 100 },
  FAILED: { label: 'Failed', pct: 0 },
};

export function GenerationProgress({ status, errorMessage }: { status: string; errorMessage?: string | null }) {
  const stage = STAGES[status] || STAGES.PENDING;
  const isFailed = status === 'FAILED';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className={isFailed ? 'text-red-400' : 'text-on-surface'}>{stage.label}</span>
        <span className="font-mono text-on-surface-variant">{stage.pct}%</span>
      </div>
      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isFailed ? 'bg-red-500' : 'stellar-gradient'}`}
          style={{ width: `${stage.pct}%` }}
        />
      </div>
      {errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
