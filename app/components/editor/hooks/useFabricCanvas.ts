import { useEffect, useRef, useState, useCallback } from "react";
import type { Canvas as FabricCanvas } from "fabric";

export interface DisplayPrintArea {
  name: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
  displayWidth: number;
  displayHeight: number;
  x: number;
  y: number;
  scale: number;
}

interface UseFabricCanvasOptions {
  canvasElId: string;
  canvasWidth: number;
  canvasHeight: number;
  blankImageUrl: string;
  printArea: { name: string; widthPx: number; heightPx: number; dpi: number };
  initialLayers?: object | null;
}

export function useFabricCanvas(options: UseFabricCanvasOptions) {
  const {
    canvasElId,
    canvasWidth,
    canvasHeight,
    blankImageUrl,
    printArea,
    initialLayers,
  } = options;

  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Compute display print area (centered, 60% of canvas width)
  const displayPrintArea: DisplayPrintArea = (() => {
    const maxWidth = canvasWidth * 0.6;
    const maxHeight = canvasHeight * 0.7;
    const aspect = printArea.widthPx / printArea.heightPx;
    let dw = maxWidth;
    let dh = dw / aspect;
    if (dh > maxHeight) {
      dh = maxHeight;
      dw = dh * aspect;
    }
    return {
      ...printArea,
      displayWidth: Math.round(dw),
      displayHeight: Math.round(dh),
      x: Math.round((canvasWidth - dw) / 2),
      y: Math.round((canvasHeight - dh) / 2),
      scale: printArea.widthPx / dw,
    };
  })();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let disposed = false;

    (async () => {
      try {
        const fabric = await import("fabric");
        if (disposed) return;

        const el = document.getElementById(canvasElId) as HTMLCanvasElement;
        if (!el) {
          setError("Canvas element not found");
          return;
        }

        const c = new fabric.Canvas(el, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: "#1a1a2e",
          preserveObjectStacking: true,
          selection: true,
        });

        // If we have saved layers, restore them
        if (initialLayers) {
          c.loadFromJSON(initialLayers, () => {
            c.renderAll();
            setCanvas(c);
            setIsReady(true);
          });
          return;
        }

        // Load blank product image as background
        const img = await fabric.FabricImage.fromURL(blankImageUrl, {
          crossOrigin: "anonymous",
        });
        img.set({
          selectable: false,
          evented: false,
          name: "__blank",
        });
        img.scaleToWidth(canvasWidth);
        const imgHeight = img.getScaledHeight();
        img.set({ top: (canvasHeight - imgHeight) / 2 });
        c.add(img);
        c.sendObjectToBack(img);

        // Add print area boundary (dashed rect, non-selectable)
        const zone = new fabric.Rect({
          left: displayPrintArea.x,
          top: displayPrintArea.y,
          width: displayPrintArea.displayWidth,
          height: displayPrintArea.displayHeight,
          fill: "rgba(99,102,241,0.05)",
          stroke: "#6366F1",
          strokeDashArray: [8, 4],
          strokeWidth: 1.5,
          selectable: false,
          evented: false,
          name: "__printArea",
        });
        c.add(zone);

        // Center snap guides
        c.on("object:moving", (e) => {
          const obj = e.target;
          if (!obj) return;
          const cx = displayPrintArea.x + displayPrintArea.displayWidth / 2;
          const cy = displayPrintArea.y + displayPrintArea.displayHeight / 2;
          const objCx = obj.left! + (obj.width! * obj.scaleX!) / 2;
          const objCy = obj.top! + (obj.height! * obj.scaleY!) / 2;
          if (Math.abs(objCx - cx) < 8) {
            obj.set("left", cx - (obj.width! * obj.scaleX!) / 2);
          }
          if (Math.abs(objCy - cy) < 8) {
            obj.set("top", cy - (obj.height! * obj.scaleY!) / 2);
          }
        });

        setCanvas(c);
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load editor");
      }
    })();

    return () => {
      disposed = true;
      // Canvas cleanup handled by component unmount
    };
  }, []);

  const addImageToCanvas = useCallback(
    async (imageUrl: string) => {
      if (!canvas) return;
      const fabric = await import("fabric");
      try {
        const img = await fabric.FabricImage.fromURL(imageUrl, {
          crossOrigin: "anonymous",
        });
        // Scale to fit print area
        const maxW = displayPrintArea.displayWidth * 0.8;
        const maxH = displayPrintArea.displayHeight * 0.8;
        const scale = Math.min(maxW / img.width!, maxH / img.height!);
        img.set({
          scaleX: scale,
          scaleY: scale,
          left:
            displayPrintArea.x +
            (displayPrintArea.displayWidth - img.width! * scale) / 2,
          top:
            displayPrintArea.y +
            (displayPrintArea.displayHeight - img.height! * scale) / 2,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      } catch {
        // Fallback placeholder
        const rect = new fabric.Rect({
          width: 200,
          height: 200,
          fill: "#6366F1",
          left: displayPrintArea.x + 50,
          top: displayPrintArea.y + 50,
        });
        canvas.add(rect);
        canvas.renderAll();
      }
    },
    [canvas, displayPrintArea],
  );

  const addTextToCanvas = useCallback(
    async (text: string, fontFamily = "Inter") => {
      if (!canvas) return;
      const fabric = await import("fabric");
      const textObj = new fabric.IText(text, {
        fontFamily,
        fontSize: 32,
        fill: "#ffffff",
        left:
          displayPrintArea.x + displayPrintArea.displayWidth / 2 - 50,
        top:
          displayPrintArea.y + displayPrintArea.displayHeight / 2 - 20,
        editable: true,
      });
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    },
    [canvas, displayPrintArea],
  );

  const addSvgToCanvas = useCallback(
    async (svgString: string) => {
      if (!canvas) return;
      const fabric = await import("fabric");
      const objects = await fabric.loadSVGFromString(svgString);
      const group = fabric.util.groupSVGElements(
        objects.objects.filter(Boolean) as any[],
        objects.options,
      );
      group.set({
        left: displayPrintArea.x + displayPrintArea.displayWidth / 2 - 30,
        top: displayPrintArea.y + displayPrintArea.displayHeight / 2 - 30,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
    },
    [canvas, displayPrintArea],
  );

  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((obj) => {
      if ((obj as any).name === "__blank" || (obj as any).name === "__printArea") return;
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  return {
    canvas,
    isReady,
    error,
    displayPrintArea,
    addImageToCanvas,
    addTextToCanvas,
    addSvgToCanvas,
    deleteSelected,
  };
}
