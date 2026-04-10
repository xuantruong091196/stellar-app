import { useEffect, useState, useCallback } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface PropertiesState {
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  fill: string;
  fontSize?: number;
  fontFamily?: string;
  type: string;
}

interface PropertiesPanelProps {
  canvas: FabricCanvas | null;
  revision: number;
}

export function PropertiesPanel({ canvas, revision }: PropertiesPanelProps) {
  const [props, setProps] = useState<PropertiesState | null>(null);

  useEffect(() => {
    if (!canvas) return;

    const update = () => {
      const obj = canvas.getActiveObject();
      if (!obj || (obj as any).name === "__blank" || (obj as any).name === "__printArea") {
        setProps(null);
        return;
      }
      setProps({
        left: Math.round(obj.left || 0),
        top: Math.round(obj.top || 0),
        width: Math.round((obj.width || 0) * (obj.scaleX || 1)),
        height: Math.round((obj.height || 0) * (obj.scaleY || 1)),
        angle: Math.round(obj.angle || 0),
        opacity: Math.round((obj.opacity ?? 1) * 100),
        fill: typeof obj.fill === "string" ? obj.fill : "#ffffff",
        fontSize: (obj as any).fontSize,
        fontFamily: (obj as any).fontFamily,
        type: obj.type || "object",
      });
    };

    canvas.on("selection:created", update);
    canvas.on("selection:updated", update);
    canvas.on("selection:cleared", () => setProps(null));
    canvas.on("object:modified", update);
    canvas.on("object:scaling", update);
    canvas.on("object:moving", update);
    canvas.on("object:rotating", update);
    update();

    return () => {
      canvas.off("selection:created", update);
      canvas.off("selection:updated", update);
      canvas.off("selection:cleared");
      canvas.off("object:modified", update);
      canvas.off("object:scaling", update);
      canvas.off("object:moving", update);
      canvas.off("object:rotating", update);
    };
  }, [canvas, revision]);

  const setProp = useCallback(
    (key: string, value: number | string) => {
      if (!canvas) return;
      const obj = canvas.getActiveObject();
      if (!obj) return;

      if (key === "width") {
        obj.set("scaleX", (value as number) / (obj.width || 1));
      } else if (key === "height") {
        obj.set("scaleY", (value as number) / (obj.height || 1));
      } else if (key === "opacity") {
        obj.set("opacity", (value as number) / 100);
      } else {
        obj.set(key as any, value);
      }
      canvas.renderAll();
    },
    [canvas],
  );

  if (!props) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Properties
        </h3>
        <p className="text-xs text-on-surface-variant/60 text-center py-6">
          Select an object to edit its properties
        </p>
      </div>
    );
  }

  const isText = props.type === "i-text" || props.type === "textbox" || props.type === "text";

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        Properties
      </h3>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <PropField label="X" value={props.left} onChange={(v) => setProp("left", v)} />
        <PropField label="Y" value={props.top} onChange={(v) => setProp("top", v)} />
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-2">
        <PropField label="W" value={props.width} onChange={(v) => setProp("width", v)} />
        <PropField label="H" value={props.height} onChange={(v) => setProp("height", v)} />
      </div>

      {/* Rotation + Opacity */}
      <div className="grid grid-cols-2 gap-2">
        <PropField label="°" value={props.angle} onChange={(v) => setProp("angle", v)} min={-360} max={360} />
        <PropField label="%" value={props.opacity} onChange={(v) => setProp("opacity", v)} min={0} max={100} />
      </div>

      {/* Color */}
      <div>
        <label className="text-[10px] text-on-surface-variant uppercase tracking-wider">Color</label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={props.fill}
            onChange={(e) => setProp("fill", e.target.value)}
            className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={props.fill}
            onChange={(e) => setProp("fill", e.target.value)}
            className="flex-1 bg-surface-container px-2 py-1 rounded text-xs font-mono border-0 focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Text-specific */}
      {isText && props.fontSize && (
        <div>
          <PropField
            label="Size"
            value={props.fontSize}
            onChange={(v) => setProp("fontSize", v)}
            min={8}
            max={200}
          />
          {props.fontFamily && (
            <p className="text-[10px] text-on-surface-variant mt-1 truncate">
              Font: {props.fontFamily}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PropField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-on-surface-variant w-4 text-right font-mono">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        className="flex-1 bg-surface-container px-2 py-1 rounded text-xs font-mono border-0 focus:ring-1 focus:ring-primary w-full"
      />
    </div>
  );
}
