export function PhysicalTimeline({ events }: { events: Array<{ event: string; date: string; txHash?: string }> }) {
  return (
    <div className="space-y-4">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-primary" />
            {i < events.length - 1 && <div className="w-px h-8 bg-outline-variant/20" />}
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">{e.event}</p>
            <p className="text-xs text-on-surface-variant">
              {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {e.txHash && (
              <a
                href={`https://stellar.expert/explorer/public/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline font-mono"
              >
                tx: {e.txHash.slice(0, 8)}...
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
