import { useEffect, useState, useRef } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { TextControls } from "./toolbar/TextControls";
import { ImageControls } from "./toolbar/ImageControls";
import { ShapeControls } from "./toolbar/ShapeControls";

function toHex(color: string): string {
  if (!color) return "#ffffff";
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color.match(/^#(.)(.)(.)$/)!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const hex = (n: string) => parseInt(n, 10).toString(16).padStart(2, "0");
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }
  return "#ffffff";
}

interface SelectedState {
  type: "text" | "image" | "shape" | null;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  underline: boolean;
  textAlign: string;
}

interface ContextualToolbarProps {
  canvas: FabricCanvas | null;
  revision: number;
  printAreaName: string;
  fonts: string[];
  loadFont: (family: string) => Promise<void>;
}

export function ContextualToolbar({
  canvas,
  revision,
  printAreaName,
  fonts,
  loadFont,
}: ContextualToolbarProps) {
  const [state, setState] = useState<SelectedState>({
    type: null, fill: "#ffffff", stroke: "#000000", strokeWidth: 0,
    opacity: 100, fontFamily: "Space Grotesk", fontSize: 24,
    fontWeight: "normal", fontStyle: "normal", underline: false, textAlign: "left",
  });
  const rafRef = useRef(0);

  useEffect(() => {
    if (!canvas) return;

    const readProps = () => {
      const obj = canvas.getActiveObject();
      if (!obj || (obj as any).name === "__blank" || (obj as any).name === "__printArea") {
        setState((prev) => ({ ...prev, type: null }));
        return;
      }
      const objType = obj.type || "";
      const isText = objType === "i-text" || objType === "textbox" || objType === "text";
      const isImage = objType === "image";
      setState({
        type: isText ? "text" : isImage ? "image" : "shape",
        fill: toHex(typeof obj.fill === "string" ? obj.fill : ""),
        stroke: toHex(typeof (obj as any).stroke === "string" ? (obj as any).stroke : ""),
        strokeWidth: (obj as any).strokeWidth || 0,
        opacity: Math.round((obj.opacity ?? 1) * 100),
        fontFamily: (obj as any).fontFamily || "Space Grotesk",
        fontSize: (obj as any).fontSize || 24,
        fontWeight: (obj as any).fontWeight || "normal",
        fontStyle: (obj as any).fontStyle || "normal",
        underline: !!(obj as any).underline,
        textAlign: (obj as any).textAlign || "left",
      });
    };

    const throttledUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(readProps);
    };

    canvas.on("selection:created", readProps);
    canvas.on("selection:updated", readProps);
    canvas.on("selection:cleared", () => setState((prev) => ({ ...prev, type: null })));
    canvas.on("object:modified", readProps);
    canvas.on("object:scaling", throttledUpdate);
    canvas.on("object:moving", throttledUpdate);
    canvas.on("object:rotating", throttledUpdate);
    readProps();

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.off("selection:created", readProps);
      canvas.off("selection:updated", readProps);
      canvas.off("selection:cleared");
      canvas.off("object:modified", readProps);
      canvas.off("object:scaling", throttledUpdate);
      canvas.off("object:moving", throttledUpdate);
      canvas.off("object:rotating", throttledUpdate);
    };
  }, [canvas, revision]);

  return (
    <div className="flex items-center bg-surface-container-low rounded-xl px-4 py-2 min-h-[44px]">
      {state.type === null && (
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-on-surface-variant">
            Print Area: <span className="font-bold text-on-surface capitalize">{printAreaName}</span>
          </span>
          <span className="text-[10px] text-on-surface-variant/60">
            Select an object to edit properties
          </span>
        </div>
      )}
      {state.type === "text" && canvas && (
        <TextControls canvas={canvas} fonts={fonts} loadFont={loadFont}
          fill={state.fill} fontFamily={state.fontFamily} fontSize={state.fontSize}
          fontWeight={state.fontWeight} fontStyle={state.fontStyle}
          underline={state.underline} textAlign={state.textAlign} />
      )}
      {state.type === "image" && canvas && (
        <ImageControls canvas={canvas} opacity={state.opacity} />
      )}
      {state.type === "shape" && canvas && (
        <ShapeControls canvas={canvas} fill={state.fill} stroke={state.stroke}
          strokeWidth={state.strokeWidth} opacity={state.opacity} />
      )}
    </div>
  );
}
