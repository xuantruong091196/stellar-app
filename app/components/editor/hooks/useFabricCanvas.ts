import { useEffect, useRef, useState, useCallback } from "react";
import type { Canvas as FabricCanvas } from "fabric";

/** Proxy external CDN images through our server to avoid CORS issues */
function proxyImageUrl(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const needsProxy = [
      "files.cdn.printful.com",
      "static.cdn.printful.com",
      "cdn.printify.com",
      "images.printify.com",
    ].includes(parsed.hostname);
    if (needsProxy) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // not a valid URL, return as-is
  }
  return url;
}

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
  blankImageUrl: string;
  printArea: { name: string; widthPx: number; heightPx: number; dpi: number };
  initialLayers?: object | null;
}

// Fixed logical canvas size — visual scaling handled via CSS transform.
// 4:5 portrait ratio suits model/lifestyle product photos.
const CANVAS_W = 800;
const CANVAS_H = 1000;

function computePrintArea(
  printArea: { name: string; widthPx: number; heightPx: number; dpi: number },
): DisplayPrintArea {
  const maxWidth = CANVAS_W * 0.55;
  const maxHeight = CANVAS_H * 0.65;
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
    x: Math.round((CANVAS_W - dw) / 2),
    y: Math.round((CANVAS_H - dh) / 2),
    scale: printArea.widthPx / dw,
  };
}

export function useFabricCanvas(options: UseFabricCanvasOptions) {
  const { canvasElId, blankImageUrl, printArea, initialLayers } = options;

  const [canvas, setCanvas] = useState<FabricCanvas | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const pa = computePrintArea(printArea);
  // Store in ref so callbacks always see latest without re-creating
  const paRef = useRef(pa);
  paRef.current = pa;

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
          width: CANVAS_W,
          height: CANVAS_H,
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

        // Load blank product image as background. Don't abort the whole
        // editor if the upstream CDN 403s or 404s (common with stale
        // Printful catalog URLs — the URL pattern changes when the
        // catalog gets re-synced). Fall back to a solid background
        // placeholder so the designer can still work.
        if (blankImageUrl) {
          try {
            const img = await fabric.FabricImage.fromURL(
              proxyImageUrl(blankImageUrl),
              { crossOrigin: "anonymous" },
            );
            if (disposed) return;
            img.set({
              selectable: false,
              evented: false,
              name: "__blank",
            });
            const scaleW = CANVAS_W / (img.width || 1);
            const scaleH = CANVAS_H / (img.height || 1);
            const fitScale = Math.min(scaleW, scaleH);
            img.set({
              scaleX: fitScale,
              scaleY: fitScale,
              left: (CANVAS_W - (img.width || 0) * fitScale) / 2,
              top: (CANVAS_H - (img.height || 0) * fitScale) / 2,
            });
            img.setCoords();
            c.add(img);
            c.sendObjectToBack(img);
          } catch (imgErr) {
            console.warn(
              `Blank image failed to load (${blankImageUrl}); continuing with placeholder background:`,
              imgErr,
            );
          }
        }

        // Snap guides (center)
        c.on("object:moving", (e) => {
          const obj = e.target;
          if (!obj) return;
          const p = paRef.current;
          const cx = p.x + p.displayWidth / 2;
          const cy = p.y + p.displayHeight / 2;
          const objCx = obj.left! + (obj.width! * obj.scaleX!) / 2;
          const objCy = obj.top! + (obj.height! * obj.scaleY!) / 2;
          if (Math.abs(objCx - cx) < 6) {
            obj.set("left", cx - (obj.width! * obj.scaleX!) / 2);
          }
          if (Math.abs(objCy - cy) < 6) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImageToCanvas = useCallback(
    async (imageUrl: string) => {
      if (!canvas) return;
      const p = paRef.current;
      const fabric = await import("fabric");
      try {
        const img = await fabric.FabricImage.fromURL(proxyImageUrl(imageUrl), {
          crossOrigin: "anonymous",
        });
        const maxW = p.displayWidth * 0.8;
        const maxH = p.displayHeight * 0.8;
        const s = Math.min(maxW / (img.width || 100), maxH / (img.height || 100));
        img.set({
          scaleX: s,
          scaleY: s,
          left: p.x + (p.displayWidth - (img.width || 100) * s) / 2,
          top: p.y + (p.displayHeight - (img.height || 100) * s) / 2,
          selectable: true,
          evented: true,
        });
        img.setCoords();
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
      } catch {
        // Fallback: colored rect
        const rect = new fabric.Rect({
          width: 150,
          height: 150,
          fill: "#6366F1",
          left: p.x + 40,
          top: p.y + 40,
          selectable: true,
          evented: true,
        });
        rect.setCoords();
        canvas.add(rect);
        canvas.requestRenderAll();
      }
    },
    [canvas],
  );

  const addTextToCanvas = useCallback(
    async (text: string, fontFamily = "Inter") => {
      if (!canvas) return;
      const p = paRef.current;
      const fabric = await import("fabric");
      const textObj = new fabric.IText(text, {
        fontFamily,
        fontSize: 32,
        fill: "#ffffff",
        left: p.x + p.displayWidth / 2 - 50,
        top: p.y + p.displayHeight / 2 - 20,
        editable: true,
        selectable: true,
        evented: true,
      });
      textObj.setCoords();
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.requestRenderAll();
    },
    [canvas],
  );

  const addSvgToCanvas = useCallback(
    async (svgString: string) => {
      if (!canvas) return;
      const p = paRef.current;
      const fabric = await import("fabric");
      const objects = await fabric.loadSVGFromString(svgString);
      const group = fabric.util.groupSVGElements(
        objects.objects.filter(Boolean) as any[],
        objects.options,
      );
      group.set({
        left: p.x + p.displayWidth / 2 - 30,
        top: p.y + p.displayHeight / 2 - 30,
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
    [canvas],
  );

  const deleteSelected = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach((obj) => {
      if ((obj as any).name === "__blank" || (obj as any).name === "__printArea") return;
      canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [canvas]);

  return {
    canvas,
    isReady,
    error,
    displayPrintArea: pa,
    addImageToCanvas,
    addTextToCanvas,
    addSvgToCanvas,
    deleteSelected,
  };
}
