import { useState, useCallback, useRef, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface AiToolsPanelProps {
  canvas: FabricCanvas | null;
  apiBaseUrl: string;
  displayPrintArea: {
    x: number;
    y: number;
    displayWidth: number;
    displayHeight: number;
    widthPx: number;
    heightPx: number;
    dpi: number;
    scale: number;
  };
  onSaveHistory: () => void;
}

type ProcessingState = "idle" | "processing" | "success" | "error";

/**
 * AI Tools — POD pipeline focused.
 *
 * Sprint 1 cleanup (per office-hours design doc 2026-05-04): removed
 * Enhance Design (vague generic AI prompt, no clear value), AI Generate
 * (already covered by Trend Suggestions flow), and Upscale (Sharp does it
 * server-side automatically in the trend pipeline). Only Remove BG remains
 * here — it's the one tool with concrete user value that doesn't have
 * a better home elsewhere yet. Long-term, Remove BG will move to
 * ContextualToolbar so it appears 1-click on any selected image, matching
 * Canva/Printify patterns. For now, keep here for backward compatibility.
 */
export function AiToolsPanel({
  canvas,
  apiBaseUrl,
  onSaveHistory,
}: AiToolsPanelProps) {
  const [state, setState] = useState<ProcessingState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const handleRemoveBg = useCallback(async () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== "image") {
      setErrorMsg("Select an image layer first");
      setState("error");
      return;
    }

    onSaveHistory();
    setState("processing");
    setErrorMsg("");
    startTimer();
    abortRef.current = new AbortController();

    try {
      // Render selected Fabric image to a Blob at 2x density.
      const el = (obj as any).toCanvasElement({ multiplier: 2 });
      const blob: Blob = await new Promise((resolve, reject) => {
        el.toBlob(
          (b: Blob | null) =>
            b ? resolve(b) : reject(new Error("Failed to encode image")),
          "image/png",
        );
      });

      // Client-side U2Net/ISNet via @imgly. ~80MB model on first call,
      // cached after. Replaced server Gemini call which drew checker
      // pattern instead of producing real alpha transparency.
      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(blob);
      const url = URL.createObjectURL(resultBlob);

      const fabric = await import("fabric");
      const newImg = await fabric.FabricImage.fromURL(url, {
        crossOrigin: "anonymous",
      });
      newImg.set({
        left: obj.left,
        top: obj.top,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        name: (obj as any).name || "bg-removed",
        selectable: true,
        evented: true,
      });
      newImg.setCoords();
      canvas.remove(obj);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      canvas.requestRenderAll();
      setState("success");
      setTimeout(() => setState("idle"), 1500);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setState("idle");
        return;
      }
      setErrorMsg(err.message || "Remove BG failed");
      setState("error");
    } finally {
      stopTimer();
    }
  }, [canvas, onSaveHistory, startTimer, stopTimer]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    setState("idle");
  }, []);

  const hasImageSelected = canvas?.getActiveObject()?.type === "image";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold mb-1">AI Tools</h3>
        <p className="text-[11px] text-on-surface-variant">
          Tools that don't live anywhere else. Generate from trends in Trend Suggestions. Upscale runs automatically on publish.
        </p>
      </div>

      <section className="space-y-3 bg-surface-container rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">content_cut</span>
          <h4 className="text-xs font-bold uppercase tracking-wider">Remove Background</h4>
        </div>
        <p className="text-[11px] text-on-surface-variant">
          {hasImageSelected
            ? "Image selected. Click to remove background and output a transparent PNG."
            : "Select an image layer on the canvas first."}
        </p>

        {state === "processing" ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Removing… {elapsed}s
            </div>
            <button
              onClick={cancelRequest}
              className="text-xs px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleRemoveBg}
            disabled={!hasImageSelected}
            className="w-full stellar-gradient text-white px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">content_cut</span>
            Remove Background
          </button>
        )}

        {state === "success" && (
          <p className="text-[11px] text-emerald-400">✓ Background removed.</p>
        )}
        {state === "error" && errorMsg && (
          <p className="text-[11px] text-red-400">✗ {errorMsg}</p>
        )}
      </section>
    </div>
  );
}
