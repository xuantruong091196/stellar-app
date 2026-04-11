import { useCallback, useState } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface BottomBarProps {
  canvas: FabricCanvas | null;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: "idle" | "saved" | "error";
}

export function BottomBar({
  canvas,
  onSave,
  isSaving,
  saveStatus,
}: BottomBarProps) {
  const [zoom, setZoom] = useState(1);

  const applyZoom = useCallback(
    (z: number) => {
      const clamped = Math.max(0.3, Math.min(3, z));
      setZoom(clamped);
      if (!canvas) return;
      canvas.setZoom(clamped);
      canvas.requestRenderAll();
    },
    [canvas],
  );

  return (
    <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-1.5 h-10">
      <div className="flex items-center gap-1">
        <button
          onClick={() => applyZoom(zoom - 0.1)}
          title="Zoom out"
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-sm">remove</span>
        </button>
        <span className="text-xs font-mono text-on-surface-variant w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => applyZoom(zoom + 0.1)}
          title="Zoom in"
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
        <button
          onClick={() => applyZoom(1)}
          title="Fit (Ctrl+0)"
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-sm">fit_screen</span>
        </button>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        className={`px-4 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all text-white ${
          saveStatus === "saved"
            ? "bg-green-500"
            : saveStatus === "error"
              ? "bg-red-500"
              : "stellar-gradient"
        }`}
      >
        <span className="material-symbols-outlined text-sm">
          {saveStatus === "saved"
            ? "check_circle"
            : saveStatus === "error"
              ? "error"
              : isSaving
                ? "hourglass_empty"
                : "save"}
        </span>
        {saveStatus === "saved"
          ? "Saved!"
          : saveStatus === "error"
            ? "Failed"
            : isSaving
              ? "Saving..."
              : "Save"}
      </button>
    </div>
  );
}
