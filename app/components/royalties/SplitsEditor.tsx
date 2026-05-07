import { useState, useMemo } from "react";
import type { RoyaltySplit } from "~/lib/types";
import { upsertRoyaltySplits, clearRoyaltySplits } from "~/lib/api";

type SplitDraft = {
  walletAddress: string;
  percentBps: number;
  role: string;
  label?: string;
  verified?: boolean;
};

interface Props {
  scopeType: "MERCHANT_PRODUCT" | "DESIGN";
  scopeId: string;
  initial: RoyaltySplit[];
  onSaved?: () => void;
}

const ROLES = ["merchant", "designer", "influencer", "agency", "other"] as const;

export function SplitsEditor({ scopeType, scopeId, initial, onSaved }: Props) {
  const [splits, setSplits] = useState<SplitDraft[]>(
    initial.length > 0
      ? initial.map((s) => ({
          walletAddress: s.walletAddress,
          percentBps: s.percentBps,
          role: s.role,
          label: s.label ?? undefined,
          verified: s.verified,
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const total = useMemo(
    () => splits.reduce((s, x) => s + (Number(x.percentBps) || 0), 0),
    [splits],
  );
  const isValid = total === 10000 && splits.length > 0 && splits.length <= 8;
  const canRemove = splits.length > 1;

  function update(i: number, patch: Partial<SplitDraft>) {
    setSplits((curr) => curr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addRow() {
    setSplits((curr) => [
      ...curr,
      { walletAddress: "", percentBps: 0, role: "other" },
    ]);
  }

  function removeRow(i: number) {
    setSplits((curr) => curr.filter((_, idx) => idx !== i));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNote(null);
    try {
      if (splits.length === 0) {
        await clearRoyaltySplits(scopeType, scopeId);
        setNote("Royalty splits removed");
      } else if (isValid) {
        await upsertRoyaltySplits({
          scopeType,
          scopeId,
          splits: splits.map(({ walletAddress, percentBps, role, label }) => ({
            walletAddress,
            percentBps,
            role,
            label,
          })),
        });
        setNote("Royalty splits saved");
      }
      onSaved?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNote(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 max-w-2xl">
      <p className="text-sm text-on-surface-variant">
        Configure how each completed order is split. Up to 8 beneficiaries; basis
        points must total exactly 10 000 (100%).
      </p>

      {splits.map((s, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 p-3 border border-outline-variant/20 rounded-lg bg-surface-container-high"
        >
          <input
            value={s.walletAddress}
            onChange={(e) => update(i, { walletAddress: e.target.value })}
            placeholder="G... wallet address"
            required
            className="flex-1 min-w-[260px] border border-outline-variant/20 rounded-lg p-2 font-mono text-sm bg-surface-container-highest text-on-surface focus:border-primary focus:outline-none"
          />
          <input
            type="number"
            min={0}
            max={10000}
            value={s.percentBps}
            onChange={(e) =>
              update(i, { percentBps: Number(e.target.value) || 0 })
            }
            className="w-24 border border-outline-variant/20 rounded-lg p-2 bg-surface-container-highest text-on-surface focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-on-surface-variant w-20">
            bps ({(s.percentBps / 100).toFixed(2)}%)
          </span>
          <select
            value={s.role}
            onChange={(e) => update(i, { role: e.target.value })}
            className="border border-outline-variant/20 rounded-lg p-2 bg-surface-container-highest text-on-surface focus:border-primary focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={s.label ?? ""}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="label (optional)"
            className="w-40 border border-outline-variant/20 rounded-lg p-2 text-sm bg-surface-container-highest text-on-surface focus:border-primary focus:outline-none"
          />
          {s.verified ? (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span
                className="material-symbols-outlined text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              verified
            </span>
          ) : (
            <span className="text-xs text-on-surface-variant">unverified</span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
              aria-label="remove row"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      ))}

      {splits.length === 0 && (
        <div className="flex items-center justify-center p-6 border border-dashed border-outline-variant/30 rounded-lg text-on-surface-variant text-sm">
          No splits configured — orders use single-recipient v1 escrow.
        </div>
      )}

      <div className="flex justify-between items-center text-sm">
        <span
          className={
            total === 10000
              ? "text-green-400 font-mono"
              : total > 10000
                ? "text-red-400 font-mono"
                : "text-on-surface-variant font-mono"
          }
        >
          Total: {total} / 10 000 bps
          {splits.length > 0 && total !== 10000 && (
            <> &mdash; {total < 10000 ? `${10000 - total} short` : `${total - 10000} over`}</>
          )}
        </span>
        <button
          type="button"
          onClick={addRow}
          disabled={splits.length >= 8}
          className="px-3 py-1.5 text-xs border border-outline-variant/20 rounded-full hover:bg-surface-container-high disabled:opacity-40 transition-colors"
        >
          + Add row
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving || (splits.length > 0 && !isValid)}
          className="px-4 py-2 bg-primary/20 text-primary border border-primary/20 rounded-lg font-bold text-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : splits.length === 0
              ? "Save (clears splits)"
              : "Save royalty splits"}
        </button>
        {note && (
          <span
            className={
              note.startsWith("Error") ? "text-red-400 text-sm" : "text-green-400 text-sm"
            }
          >
            {note}
          </span>
        )}
      </div>

      <p className="text-[10px] text-on-surface-variant pt-2 border-t border-outline-variant/10">
        <strong>Deferred:</strong> Wallet-ownership verification (challenge/sign flow via
        Freighter) is not yet wired. Verified badges are read-only from the server.
      </p>
    </form>
  );
}
