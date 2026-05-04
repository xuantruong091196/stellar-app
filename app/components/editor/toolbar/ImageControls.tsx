import { useCallback, useState } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface ImageControlsProps {
  canvas: FabricCanvas;
  opacity: number;
}

export function ImageControls({ canvas, opacity }: ImageControlsProps) {
  const [bgState, setBgState] = useState<"idle" | "processing" | "error">("idle");
  const [bgError, setBgError] = useState<string>("");

  const handleFlip = useCallback(
    (axis: "flipX" | "flipY") => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      obj.set(axis, !obj[axis]);
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const setOpacity = useCallback(
    (value: number) => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      obj.set("opacity", value / 100);
      obj.setCoords();
      canvas.requestRenderAll();
    },
    [canvas],
  );

  /**
   * Inline Remove Background — 1-click on the selected image, like Canva's
   * BG Remover. Renders the active image to base64 at 2x density, posts to
   * /api/clipart/ai-remove-bg (Gemini editImage server-side), then swaps
   * the source image with the returned transparent PNG while preserving
   * position/scale/rotation. Loading state shows in-button so the user
   * doesn't hunt for a side panel.
   */
  const handleRemoveBg = useCallback(async () => {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== "image") return;

    let base64: string | null = null;
    try {
      const el = (obj as any).toCanvasElement({ multiplier: 2 });
      base64 = el.toDataURL("image/png").split(",")[1];
    } catch {
      setBgError("Could not export image (CORS?)");
      setBgState("error");
      setTimeout(() => setBgState("idle"), 2500);
      return;
    }
    if (!base64) return;

    setBgState("processing");
    setBgError("");

    try {
      const res = await fetch("/api/clipart/ai-remove-bg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      if (!res.ok) throw new Error(`Remove BG failed: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.imageUrl) throw new Error("No image returned");

      const fabric = await import("fabric");
      const newImg = await fabric.FabricImage.fromURL(data.imageUrl, {
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

      setBgState("idle");
    } catch (err: any) {
      setBgError(err?.message || "Remove BG failed");
      setBgState("error");
      setTimeout(() => setBgState("idle"), 3000);
    }
  }, [canvas]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleRemoveBg}
        disabled={bgState === "processing"}
        title={bgError || "Remove background (AI)"}
        className={`h-7 px-2 rounded-md flex items-center gap-1 text-xs transition-colors ${
          bgState === "error"
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
        }`}
      >
        <span className={`material-symbols-outlined text-sm ${bgState === "processing" ? "animate-spin" : ""}`}>
          {bgState === "processing" ? "progress_activity" : bgState === "error" ? "error" : "content_cut"}
        </span>
        {bgState === "processing" ? "Removing…" : bgState === "error" ? "Failed" : "Remove BG"}
      </button>

      <div className="h-5 w-px bg-outline-variant/30" />

      <button
        onClick={() => handleFlip("flipX")}
        title="Flip Horizontal"
        className="h-7 px-2 rounded-md flex items-center gap-1 text-xs hover:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-sm">flip</span>
        Flip H
      </button>
      <button
        onClick={() => handleFlip("flipY")}
        title="Flip Vertical"
        className="h-7 px-2 rounded-md flex items-center gap-1 text-xs hover:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-sm" style={{ transform: "rotate(90deg)" }}>
          flip
        </span>
        Flip V
      </button>

      <div className="h-5 w-px bg-outline-variant/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-on-surface-variant">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
          className="w-20 h-1 accent-primary"
        />
        <span className="text-xs font-mono text-on-surface-variant w-8">
          {opacity}%
        </span>
      </div>
    </div>
  );
}
