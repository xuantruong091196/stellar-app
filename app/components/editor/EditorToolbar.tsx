import { useCallback, useEffect, useState } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface EditorToolbarProps {
  canvas: FabricCanvas | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onAiEnhance?: () => void;
  isEnhancing?: boolean;
  isSaving: boolean;
  saveStatus?: "idle" | "saved" | "error";
}

export function EditorToolbar({
  canvas,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onAiEnhance,
  isEnhancing = false,
  isSaving,
  saveStatus = "idle",
}: EditorToolbarProps) {
  const [zoom, setZoom] = useState(1);

  const applyZoom = useCallback(
    (z: number) => {
      setZoom(z);
      if (!canvas) return;
      canvas.setZoom(z);
      const wrapper = canvas.getElement().parentElement;
      if (wrapper) {
        const baseW = wrapper.clientWidth;
        const baseH = wrapper.clientHeight;
        canvas.setDimensions({ width: baseW * z, height: baseH * z });
      }
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const zoomIn = useCallback(() => applyZoom(Math.min(zoom + 0.1, 3)), [zoom, applyZoom]);
  const zoomOut = useCallback(() => applyZoom(Math.max(zoom - 0.1, 0.3)), [zoom, applyZoom]);
  const zoomFit = useCallback(() => applyZoom(1), [applyZoom]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }
      if ((mod && e.key === "y") || (mod && e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        onRedo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && canvas) {
        const active = canvas.getActiveObject();
        if (active && !(active as any).isEditing) {
          const name = (active as any).name;
          if (name !== "__blank" && name !== "__printArea") {
            canvas.remove(active);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }
        }
        return;
      }
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
        return;
      }
      if (e.key === "-") {
        e.preventDefault();
        zoomOut();
        return;
      }
      if (e.key === "0" && mod) {
        e.preventDefault();
        zoomFit();
        return;
      }
      if (canvas && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const obj = canvas.getActiveObject();
        if (!obj || (obj as any).isEditing) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        switch (e.key) {
          case "ArrowUp": obj.set("top", (obj.top || 0) - step); break;
          case "ArrowDown": obj.set("top", (obj.top || 0) + step); break;
          case "ArrowLeft": obj.set("left", (obj.left || 0) - step); break;
          case "ArrowRight": obj.set("left", (obj.left || 0) + step); break;
        }
        obj.setCoords();
        canvas.requestRenderAll();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canvas, onUndo, onRedo, zoomIn, zoomOut, zoomFit]);

  return (
    <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-2">
      <div className="flex items-center gap-1">
        <ToolBtn icon="undo" label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
        <ToolBtn icon="redo" label="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />
      </div>

      <div className="flex items-center gap-1">
        <ToolBtn icon="remove" label="Zoom out" onClick={zoomOut} />
        <span className="text-xs font-mono text-on-surface-variant w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <ToolBtn icon="add" label="Zoom in" onClick={zoomIn} />
        <ToolBtn icon="fit_screen" label="Fit (Ctrl+0)" onClick={zoomFit} />
      </div>

      <div className="flex items-center gap-2">
        {onAiEnhance && (
          <button
            onClick={onAiEnhance}
            disabled={isEnhancing}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all"
            title="AI will re-render your design with smooth, professional quality"
          >
            <span className="material-symbols-outlined text-sm">
              {isEnhancing ? "hourglass_empty" : "auto_awesome"}
            </span>
            {isEnhancing ? "Enhancing..." : "AI Enhance"}
          </button>
        )}
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all text-white ${
            saveStatus === "saved"
              ? "bg-green-500"
              : saveStatus === "error"
                ? "bg-red-500"
                : "stellar-gradient"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {saveStatus === "saved" ? "check_circle" : saveStatus === "error" ? "error" : isSaving ? "hourglass_empty" : "save"}
          </span>
          {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Save Failed" : isSaving ? "Saving..." : "Save Design"}
        </button>
      </div>
    </div>
  );
}

function ToolBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <span className="material-symbols-outlined text-base">{icon}</span>
    </button>
  );
}
