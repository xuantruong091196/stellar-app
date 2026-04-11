import { useCallback } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface ImageControlsProps {
  canvas: FabricCanvas;
  opacity: number;
}

export function ImageControls({ canvas, opacity }: ImageControlsProps) {
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

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
