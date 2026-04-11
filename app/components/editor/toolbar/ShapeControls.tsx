import { useCallback } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { ColorPicker } from "./ColorPicker";

interface ShapeControlsProps {
  canvas: FabricCanvas;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export function ShapeControls({
  canvas,
  fill,
  stroke,
  strokeWidth,
  opacity,
}: ShapeControlsProps) {
  const setProp = useCallback(
    (key: string, value: string | number) => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      if (key === "opacity") {
        obj.set("opacity", (value as number) / 100);
      } else {
        obj.set(key as any, value);
      }
      obj.setCoords();
      canvas.requestRenderAll();
    },
    [canvas],
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-on-surface-variant">Fill</span>
        <ColorPicker color={fill} onChange={(c) => setProp("fill", c)} />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-on-surface-variant">Stroke</span>
        <ColorPicker color={stroke || "#000000"} onChange={(c) => setProp("stroke", c)} />
      </div>

      <select
        value={strokeWidth}
        onChange={(e) => setProp("strokeWidth", parseInt(e.target.value, 10))}
        className="bg-surface-container px-2 py-1 rounded text-xs border-0 focus:ring-1 focus:ring-primary w-14"
        title="Stroke width"
      >
        {[0, 1, 2, 3, 5, 8].map((w) => (
          <option key={w} value={w}>{w}px</option>
        ))}
      </select>

      <div className="h-5 w-px bg-outline-variant/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-on-surface-variant">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setProp("opacity", parseInt(e.target.value, 10))}
          className="w-20 h-1 accent-primary"
        />
        <span className="text-xs font-mono text-on-surface-variant w-8">
          {opacity}%
        </span>
      </div>
    </div>
  );
}
