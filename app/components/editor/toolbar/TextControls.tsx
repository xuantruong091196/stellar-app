import { useCallback } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { ColorPicker } from "./ColorPicker";

interface TextControlsProps {
  canvas: FabricCanvas;
  fonts: string[];
  loadFont: (family: string) => Promise<void>;
  fill: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  textAlign: string;
}

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 24, 36, 48, 72];

export function TextControls({
  canvas,
  fonts,
  loadFont,
  fill,
  fontFamily,
  fontSize,
  fontWeight,
  fontStyle,
  underline,
  textAlign,
}: TextControlsProps) {
  const setProp = useCallback(
    (key: string, value: string | number | boolean) => {
      const obj = canvas.getActiveObject();
      if (!obj) return;
      obj.set(key as any, value);
      obj.setCoords();
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const handleFontChange = useCallback(
    async (family: string) => {
      await loadFont(family);
      setProp("fontFamily", family);
    },
    [loadFont, setProp],
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={fontFamily}
        onChange={(e) => handleFontChange(e.target.value)}
        className="bg-surface-container px-2 py-1 rounded text-xs border-0 focus:ring-1 focus:ring-primary max-w-[140px]"
        style={{ fontFamily }}
      >
        {fonts.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>

      <select
        value={fontSize}
        onChange={(e) => setProp("fontSize", parseInt(e.target.value, 10))}
        className="bg-surface-container px-2 py-1 rounded text-xs font-mono border-0 focus:ring-1 focus:ring-primary w-16"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="h-5 w-px bg-outline-variant/30" />

      <button
        onClick={() => setProp("fontWeight", fontWeight === "bold" ? "normal" : "bold")}
        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
          fontWeight === "bold" ? "bg-primary/20 text-primary" : "hover:bg-surface-container-high"
        }`}
        title="Bold"
      >
        B
      </button>
      <button
        onClick={() => setProp("fontStyle", fontStyle === "italic" ? "normal" : "italic")}
        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs italic transition-colors ${
          fontStyle === "italic" ? "bg-primary/20 text-primary" : "hover:bg-surface-container-high"
        }`}
        title="Italic"
      >
        I
      </button>
      <button
        onClick={() => setProp("underline", !underline)}
        className={`w-7 h-7 rounded-md flex items-center justify-center text-xs underline transition-colors ${
          underline ? "bg-primary/20 text-primary" : "hover:bg-surface-container-high"
        }`}
        title="Underline"
      >
        U
      </button>

      <div className="h-5 w-px bg-outline-variant/30" />

      <ColorPicker color={fill} onChange={(c) => setProp("fill", c)} />

      <div className="h-5 w-px bg-outline-variant/30" />

      {(["left", "center", "right"] as const).map((align) => (
        <button
          key={align}
          onClick={() => setProp("textAlign", align)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            textAlign === align ? "bg-primary/20 text-primary" : "hover:bg-surface-container-high"
          }`}
          title={`Align ${align}`}
        >
          <span className="material-symbols-outlined text-sm">
            {align === "left" ? "format_align_left" : align === "center" ? "format_align_center" : "format_align_right"}
          </span>
        </button>
      ))}
    </div>
  );
}
