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
  containerRef: React.RefObject<HTMLDivElement | null>;
  blankImageUrl: string;
  printArea: { name: string; widthPx: number; heightPx: number; dpi: number };
  initialLayers?: object | null;
}

function computePrintArea(
  canvasWidth: number,
  canvasHeight: number,
  printArea: { name: string; widthPx: number; heightPx: number; dpi: number },
): DisplayPrintArea {
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
}

export function useFabricCanvas(options: UseFabricCanvasOptions) {
  const { canvasElId, containerRef, blankImageUrl, printArea, initialLayers } =
    options;

  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 510 });
  const initRef = useRef(false);

  // Track container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(300, Math.round(rect.width - 32));
      const h = Math.max(400, Math.round(w * 0.85));
      setCanvasSize((prev) => {
        if (prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;

  const displayPrintArea = computePrintArea(canvasWidth, canvasHeight, printArea);

  // Resize canvas when container size changes
  useEffect(() => {
    if (!canvas) return;
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });

    // Reposition blank image + print area zone
    const objects = canvas.getObjects();
    const blank = objects.find((o) => (o as any).name === "__blank");
    if (blank) {
      blank.scaleToWidth(canvasWidth);
      const imgH = blank.getScaledHeight();
      blank.set({ top: (canvasHeight - imgH) / 2 });
      blank.setCoords();
    }
    const zone = objects.find((o) => (o as any).name === "__printArea");
    if (zone) {
      zone.set({
        left: displayPrintArea.x,
        top: displayPrintArea.y,
        width: displayPrintArea.displayWidth,
        height: displayPrintArea.displayHeight,
      });
      zone.setCoords();
    }
    canvas.renderAll();
  }, [canvas, canvasWidth, canvasHeight, displayPrintArea]);

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
        img.setCoords();
        c.add(img);
        c.sendObjectToBack(img);

        // Add print area boundary (dashed rect, non-selectable)
        const pa = computePrintArea(canvasWidth, canvasHeight, printArea);
        const zone = new fabric.Rect({
          left: pa.x,
          top: pa.y,
          width: pa.displayWidth,
          height: pa.displayHeight,
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
          const cx = pa.x + pa.displayWidth / 2;
          const cy = pa.y + pa.displayHeight / 2;
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
        const maxW = displayPrintArea.displayWidth * 0.8;
        const maxH = displayPrintArea.displayHeight * 0.8;
        const scale = Math.min(
          maxW / (img.width || 100),
          maxH / (img.height || 100),
        );
        img.set({
          scaleX: scale,
          scaleY: scale,
          left:
            displayPrintArea.x +
            (displayPrintArea.displayWidth - (img.width || 100) * scale) / 2,
          top:
            displayPrintArea.y +
            (displayPrintArea.displayHeight - (img.height || 100) * scale) / 2,
          selectable: true,
          evented: true,
        });
        img.setCoords();
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      } catch {
        const rect = new fabric.Rect({
          width: 200,
          height: 200,
          fill: "#6366F1",
          left: displayPrintArea.x + 50,
          top: displayPrintArea.y + 50,
        });
        canvas.add(rect);
        canvas.requestRenderAll();
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
        left: displayPrintArea.x + displayPrintArea.displayWidth / 2 - 50,
        top: displayPrintArea.y + displayPrintArea.displayHeight / 2 - 20,
        editable: true,
        selectable: true,
        evented: true,
      });
      textObj.setCoords();
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.requestRenderAll();
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
        selectable: true,
        evented: true,
      });
      group.setCoords();
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
    },
    [canvas, displayPrintArea],
  );

  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((obj) => {
      if (
        (obj as any).name === "__blank" ||
        (obj as any).name === "__printArea"
      )
        return;
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
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
