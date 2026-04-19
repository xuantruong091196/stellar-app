import type { Escrow, EscrowStatus } from "~/lib/types";

const STELLAR_EXPLORER = "https://stellar.expert/explorer/public";

interface TimelineStep {
  key: string;
  label: string;
  txHash: string | null;
  timestamp: string | null;
}

function buildSteps(escrow: Escrow): TimelineStep[] {
  return [
    {
      key: "LOCKING",
      label: "Locking",
      txHash: escrow.lockTxHash,
      timestamp: escrow.createdAt,
    },
    {
      key: "LOCKED",
      label: "Locked",
      txHash: escrow.lockTxHash,
      timestamp: escrow.lockedAt,
    },
    {
      key: "SHIPPED",
      label: "Shipped",
      txHash: null,
      timestamp: null,
    },
    {
      key: "RELEASED",
      label: "Released",
      txHash: escrow.releaseTxHash ?? escrow.refundTxHash,
      timestamp: escrow.releasedAt,
    },
  ];
}

const STATUS_ORDER: Record<string, number> = {
  LOCKING: 0,
  LOCK_FAILED: 0,
  LOCKED: 1,
  RELEASING: 2,
  RELEASED: 3,
  DISPUTED: 1,
  REFUNDED: 3,
  EXPIRED: 1,
};

function stepIndex(status: EscrowStatus): number {
  return STATUS_ORDER[status] ?? 0;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={`${STELLAR_EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[10px] text-primary hover:underline truncate max-w-[90px] inline-block"
      title={hash}
    >
      {hash.slice(0, 8)}...
    </a>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 inline-block ml-1 -mt-0.5"
    >
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.25-.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V6.31l-5.47 5.47a.75.75 0 1 1-1.06-1.06l5.47-5.47H12.25a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EscrowTimeline({ escrow }: { escrow: Escrow }) {
  const steps = buildSteps(escrow);
  const activeIdx = stepIndex(escrow.status);

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-surface-container-highest rounded-full" />
        {/* Progress fill */}
        <div
          className="absolute top-5 left-[5%] h-0.5 stellar-gradient rounded-full transition-all duration-500"
          style={{
            width: `${(activeIdx / (steps.length - 1)) * 90}%`,
          }}
        />

        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const reached = i <= activeIdx;
            return (
              <div
                key={step.key}
                className="flex flex-col items-center w-1/4"
              >
                {/* Circle */}
                <div
                  className={
                    reached
                      ? "w-10 h-10 rounded-full stellar-gradient flex items-center justify-center text-white font-bold shadow-lg z-10"
                      : "w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant z-10"
                  }
                >
                  {reached ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-current" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`text-xs font-bold mt-2 ${reached ? "text-on-surface" : "text-on-surface-variant"}`}
                >
                  {step.label}
                </p>

                {/* Timestamp */}
                {step.timestamp && (
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {formatDate(step.timestamp)}
                  </p>
                )}

                {/* Tx Hash link */}
                {step.txHash && <TxLink hash={step.txHash} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ViewOnStellarButton({ lockTxHash }: { lockTxHash: string }) {
  return (
    <a
      href={`${STELLAR_EXPLORER}/tx/${lockTxHash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 text-primary text-sm font-bold hover:bg-primary/10 transition-colors"
    >
      View on Stellar Explorer
      <ExternalLinkIcon />
    </a>
  );
}
