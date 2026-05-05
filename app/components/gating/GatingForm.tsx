import { useState } from "react";
import { api } from "~/lib/api";
import type { GatingData, UpsertGatingPayload } from "~/lib/api";

interface Props {
  productId: string;
  initial: GatingData | null;
  onSaved?: () => void;
}

export function GatingForm({ productId, initial, onSaved }: Props) {
  const [active, setActive] = useState(initial?.isActive ?? false);
  const [code, setCode] = useState(initial?.assetCode ?? "");
  const [issuer, setIssuer] = useState(initial?.issuerAddress ?? "");
  const [type, setType] = useState<"CLASSIC" | "SOROBAN_SAC">(
    initial?.assetType ?? "CLASSIC",
  );
  const [minBalance, setMin] = useState(initial?.minBalance ?? "1");
  const [errMsg, setErrMsg] = useState(initial?.errorMessage ?? "");
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedNote(null);

    try {
      if (!active && initial) {
        // Toggling off an existing gate → DELETE via proxy
        const res = await api(
          `/gating/${encodeURIComponent(productId)}`,
          { method: "DELETE" },
        );
        if (res.error) throw new Error(res.error);
        setSavedNote("Gating removed");
      } else if (active) {
        const payload: UpsertGatingPayload = {
          merchantProductId: productId,
          assetCode: code,
          issuerAddress: issuer,
          assetType: type,
          minBalance,
          errorMessage: errMsg || undefined,
          isActive: true,
        };
        const res = await api<GatingData>("/gating", {
          method: "POST",
          body: payload,
        });
        if (res.error) throw new Error(res.error);
        setSavedNote("Gating saved");
      } else {
        // active=false but no existing rule — nothing to do
        setSavedNote("No changes");
      }
      onSaved?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSavedNote(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setActive((v) => !v)}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            active ? "bg-primary" : "bg-surface-container-highest"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
        <span className="text-sm font-medium text-on-surface">
          Restrict purchase to asset holders
        </span>
      </label>

      {active && (
        <div className="space-y-4 pl-1">
          {/* Asset type */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Asset type
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "CLASSIC" | "SOROBAN_SAC")
              }
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/10 text-sm text-on-surface focus:border-primary focus:outline-none"
            >
              <option value="CLASSIC">Classic Asset (trustline)</option>
              <option value="SOROBAN_SAC">Soroban SAC (contract balance)</option>
            </select>
          </div>

          {/* Asset code */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Asset code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="STELO0042"
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/10 text-sm font-mono text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          {/* Issuer address */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Issuer address{" "}
              <span className="normal-case text-on-surface-variant/60">
                ({type === "SOROBAN_SAC" ? "C… contract" : "G… wallet"})
              </span>
            </label>
            <input
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder={type === "SOROBAN_SAC" ? "C..." : "G..."}
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/10 text-sm font-mono text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          {/* Minimum balance */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Minimum balance
            </label>
            <input
              value={minBalance}
              onChange={(e) => setMin(e.target.value)}
              placeholder="1"
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/10 text-sm font-mono text-on-surface focus:border-primary focus:outline-none"
            />
          </div>

          {/* Error message */}
          <div>
            <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Error message{" "}
              <span className="normal-case font-normal text-on-surface-variant/60">
                (optional)
              </span>
            </label>
            <textarea
              value={errMsg}
              onChange={(e) => setErrMsg(e.target.value)}
              placeholder="Shown to buyers who don't hold the required asset"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/10 text-sm text-on-surface focus:border-primary focus:outline-none resize-none"
            />
            <p className="text-[10px] text-on-surface-variant mt-1">
              Defaults to "You need at least {minBalance || "1"} {code || "TOKEN"} to purchase this product."
            </p>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/20 font-bold text-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save gating"}
      </button>

      {savedNote && (
        <p
          className={`text-xs font-medium ${
            savedNote.startsWith("Error") ? "text-red-400" : "text-green-400"
          }`}
        >
          {savedNote}
        </p>
      )}
    </form>
  );
}
