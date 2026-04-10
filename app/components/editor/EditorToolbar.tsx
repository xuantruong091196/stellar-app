import { useCallback, useEffect } from "react";
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
  zoom: number;
  onZoomChange: (zoom: number) => void;
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
  zoom,
  onZoomChange,
}: EditorToolbarProps) {
  const zoomIn = useCallback(() => {
    onZoomChange(Math.min(zoom + 0.1, 3));
  }, [zoom, onZoomChange]);

  const zoomOut = useCallback(() => {
    onZoomChange(Math.max(zoom - 0.1, 0.3));
  }, [zoom, onZoomChange]);

  const zoomFit = useCallback(() => {
    onZoomChange(1);
  }, [onZoomChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Undo: Ctrl+Z
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((mod && e.key === "y") || (mod && e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        onRedo();
        return;
      }
      // Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && canvas) {
        const active = canvas.getActiveObject();
        if (active && !(active as any).isEditing) {
          const name = (active as any).name;
          if (name !== "__blank" && name !== "__printArea") {
            canvas.remove(active);
            canvas.discardActiveObject();
            canvas.renderAll();
          }
        }
        return;
      }
      // Zoom: + / -
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
      // Fit: 0
      if (e.key === "0" && mod) {
        e.preventDefault();
        zoomFit();
        return;
      }
      // Nudge with arrow keys
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
        canvas.renderAll();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canvas, onUndo, onRedo, zoomIn, zoomOut, zoomFit]);

  return (
    <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-2">
      {/* Left: Undo/Redo */}
      <div className="flex items-center gap-1">
        <ToolBtn
          icon="undo"
          label="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
        />
        <ToolBtn
          icon="redo"
          label="Redo (Ctrl+Y)"
          onClick={onRedo}
          disabled={!canRedo}
        />
      </div>

      {/* Center: Zoom */}
      <div className="flex items-center gap-1">
        <ToolBtn icon="remove" label="Zoom out" onClick={zoomOut} />
        <span className="text-xs font-mono text-on-surface-variant w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <ToolBtn icon="add" label="Zoom in" onClick={zoomIn} />
        <ToolBtn icon="fit_screen" label="Fit (Ctrl+0)" onClick={zoomFit} />
      </div>

      {/* Right: AI Enhance + Save */}
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
          className="stellar-gradient text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all"
        >
          <span className="material-symbols-outlined text-sm">
            {isSaving ? "hourglass_empty" : "save"}
          </span>
          {isSaving ? "Saving..." : "Save Design"}
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
