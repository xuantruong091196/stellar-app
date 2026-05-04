import { useMemo, useState } from "react";
import { apiPost, deriveStoreId } from "~/lib/api";
import type { ProviderProduct, MerchantProduct } from "~/lib/types";

/**
 * "Apply to Other Products" — Sprint 3 of the POD-native editor.
 *
 * After a seller saves their first draft (e.g., a t-shirt with a trend
 * design), this modal lets them stamp the same design across N other
 * provider products in one shot — mug, hoodie, tote, sticker, etc.
 *
 * Each selected product becomes its own draft via the existing
 * POST /products/:storeId endpoint. Print config defaults to centered
 * + full-width on the new product's first print area; sellers can open
 * each new draft to fine-tune placement later. The overlay data URL
 * (the design-only PNG from the editor) is sent alongside, so each new
 * draft kicks off the BullMQ color-variant pipeline automatically — no
 * manual mockup work per product.
 *
 * MVP: no backend changes. Frontend loops the existing endpoint
 * sequentially (parallel risks per-store rate limits and makes errors
 * harder to attribute). Each call is ~1-2s, so 5 products = ~5-10s.
 * Progress is shown inline.
 */

interface Props {
  currentProviderProductId: string;
  providerProducts: ProviderProduct[];
  designId: string;
  overlayDataUrl: string | null;
  walletAddress: string;
  defaultTitle: string;
  defaultRetailPrice: number;
  onClose: () => void;
  onComplete: (created: string[]) => void;
}

interface BulkResult {
  ok: string[];
  failed: Array<{ id: string; name: string; error: string }>;
}

export function ApplyToProductsModal({
  currentProviderProductId,
  providerProducts,
  designId,
  overlayDataUrl,
  walletAddress,
  defaultTitle,
  defaultRetailPrice,
  onClose,
  onComplete,
}: Props) {
  const candidates = useMemo(
    () => providerProducts.filter((p) => p.id !== currentProviderProductId),
    [providerProducts, currentProviderProductId],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"idle" | "creating" | "done">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0, name: "" });
  const [result, setResult] = useState<BulkResult>({ ok: [], failed: [] });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(candidates.map((p) => p.id)));
  const clearAll = () => setSelected(new Set());

  const apply = async () => {
    if (selected.size === 0) return;
    setPhase("creating");
    const ids = Array.from(selected);
    const targets = candidates.filter((p) => ids.includes(p.id));
    const out: BulkResult = { ok: [], failed: [] };

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      setProgress({ current: i + 1, total: targets.length, name: target.name });

      // Use the new product's first print area as the home for the
      // design. printConfig is centered + full-width by default — the
      // seller can refine per-product later.
      const printAreaName = target.printAreas?.[0]?.name || "front";

      const body = {
        designId,
        providerProductId: target.id,
        title: defaultTitle,
        retailPrice: defaultRetailPrice,
        printConfig: {
          printArea: printAreaName,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        },
        ...(overlayDataUrl ? { overlayDataUrl } : {}),
      };

      const res = await apiPost<MerchantProduct>(
        `/products/${deriveStoreId(walletAddress)}`,
        body,
        walletAddress,
      );

      if (res.error || !res.data) {
        out.failed.push({
          id: target.id,
          name: target.name,
          error: res.error || "Unknown error",
        });
      } else {
        out.ok.push(res.data.id);
      }
    }

    setResult(out);
    setPhase("done");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div>
            <h2 className="text-lg font-bold font-headline">Apply to Other Products</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Stamp this design across more products with one click. Each becomes a new draft.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-container-high flex items-center justify-center"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {phase === "idle" && (
          <>
            <div className="flex items-center justify-between px-6 py-2 border-b border-outline-variant/10 text-xs">
              <span className="text-on-surface-variant">
                {selected.size} of {candidates.length} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-primary hover:underline"
                >
                  Select all
                </button>
                <span className="text-on-surface-variant">·</span>
                <button
                  onClick={clearAll}
                  className="text-on-surface-variant hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {candidates.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-8">
                  No other provider products available.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {candidates.map((p) => {
                    const isSelected = selected.has(p.id);
                    const blank = Object.values(p.blankImages || {})[0];
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`text-left rounded-xl border-2 p-3 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container-low"
                        }`}
                      >
                        <div className="aspect-square mb-2 rounded-lg bg-surface-container-high overflow-hidden flex items-center justify-center">
                          {blank ? (
                            <img
                              src={blank as string}
                              alt={p.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
                              checkroom
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                          {p.productType}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                onClick={apply}
                disabled={selected.size === 0}
                className="px-6 py-2 rounded-full stellar-gradient text-white text-sm font-bold disabled:opacity-50"
              >
                Create {selected.size} draft{selected.size === 1 ? "" : "s"}
              </button>
            </footer>
          </>
        )}

        {phase === "creating" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-on-surface">
              Creating {progress.current} of {progress.total}…
            </p>
            <p className="text-xs text-on-surface-variant">{progress.name}</p>
            <div className="w-full max-w-sm bg-surface-container-high rounded-full h-2 overflow-hidden">
              <div
                className="h-full stellar-gradient transition-all duration-300"
                style={{
                  width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {phase === "done" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {result.ok.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-4">
                  <p className="text-sm font-bold text-emerald-300">
                    ✓ Created {result.ok.length} draft{result.ok.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-emerald-300/70 mt-1">
                    Color-variant mockups are generating in the background. Check the Products list.
                  </p>
                </div>
              )}
              {result.failed.length > 0 && (
                <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-bold text-red-300">
                    ✗ Failed for {result.failed.length}:
                  </p>
                  <ul className="text-xs text-red-300/80 space-y-1">
                    {result.failed.map((f) => (
                      <li key={f.id}>
                        <span className="font-bold">{f.name}</span> — {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm hover:bg-surface-container-high"
              >
                Close
              </button>
              <button
                onClick={() => onComplete(result.ok)}
                className="px-6 py-2 rounded-full stellar-gradient text-white text-sm font-bold"
              >
                Go to Products
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
