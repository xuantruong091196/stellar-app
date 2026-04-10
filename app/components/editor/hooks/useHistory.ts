import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas as FabricCanvas } from "fabric";

const MAX_HISTORY = 200;

export function useHistory(canvas: FabricCanvas | null) {
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isRestoring = useRef(false);
  const [revision, setRevision] = useState(0);

  const saveState = useCallback(() => {
    if (!canvas || isRestoring.current) return;
    const json = JSON.stringify((canvas as any).toJSON(["name", "selectable", "evented"]));
    undoStack.current.push(json);
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    setRevision((r) => r + 1);
  }, [canvas]);

  const undo = useCallback(() => {
    if (!canvas || undoStack.current.length <= 1) return;
    isRestoring.current = true;
    redoStack.current.push(undoStack.current.pop()!);
    const prev = undoStack.current[undoStack.current.length - 1];
    canvas.loadFromJSON(JSON.parse(prev), () => {
      canvas.renderAll();
      isRestoring.current = false;
      setRevision((r) => r + 1);
    });
  }, [canvas]);

  const redo = useCallback(() => {
    if (!canvas || redoStack.current.length === 0) return;
    isRestoring.current = true;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    canvas.loadFromJSON(JSON.parse(next), () => {
      canvas.renderAll();
      isRestoring.current = false;
      setRevision((r) => r + 1);
    });
  }, [canvas]);

  // Save base state once canvas is ready
  const saveBaseState = useCallback(() => {
    if (!canvas) return;
    const json = JSON.stringify((canvas as any).toJSON(["name", "selectable", "evented"]));
    undoStack.current = [json];
    redoStack.current = [];
    setRevision((r) => r + 1);
  }, [canvas]);

  // Auto-save on modifications
  useEffect(() => {
    if (!canvas) return;
    const handler = () => saveState();
    canvas.on("object:modified", handler);
    canvas.on("object:added", handler);
    canvas.on("object:removed", handler);
    return () => {
      canvas.off("object:modified", handler);
      canvas.off("object:added", handler);
      canvas.off("object:removed", handler);
    };
  }, [canvas, saveState]);

  return {
    undo,
    redo,
    saveBaseState,
    canUndo: undoStack.current.length > 1,
    canRedo: redoStack.current.length > 0,
    revision,
  };
}
