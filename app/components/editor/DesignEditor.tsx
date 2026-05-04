import { useState, useCallback, useEffect, useRef } from "react";
import { useFabricCanvas } from "./hooks/useFabricCanvas";
import { useHistory } from "./hooks/useHistory";
import { useGoogleFonts } from "./hooks/useGoogleFonts";
import { exportAtPrintDPI, exportFullCanvas } from "./utils/export";
import { apiPost } from "~/lib/api";
import { IconToolbar } from "./IconToolbar";
import type { PanelTab } from "./IconToolbar";
import { ExpandablePanel } from "./ExpandablePanel";
import { BottomBar } from "./BottomBar";
import { ContextualToolbar } from "./ContextualToolbar";
import { PrintReadinessBar } from "./PrintReadinessBar";
import { LayerPanel } from "./panels/LayerPanel";
import { TextPanel } from "./panels/TextPanel";
import { ShapesPanel } from "./panels/ShapesPanel";
import { UploadPanel } from "./panels/UploadPanel";
import { AiToolsPanel } from "./panels/AiToolsPanel";

interface PrintAreaDef {
  name: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

interface PrintConfigResult {
  printArea: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface DesignEditorProps {
  blankImageUrl: string;
  printAreas: PrintAreaDef[];
  designImageUrl?: string;
  designId?: string;
  initialLayers?: object | null;
  apiBaseUrl: string;
  onSave: (data: {
    printArea: string;
    layers: object;
    exportDataUrl: string;
    mockupDataUrl: string;
    overlayDataUrl: string;
    printConfig: PrintConfigResult;
  }) => void;
  isSaving?: boolean;
}

/**
 * Compute printConfig from the current Fabric canvas state.
 *
 * Reads the bounding rect of all user-placed objects (excluding the blank
 * background and print-area overlay), then expresses their position and size
 * relative to the print area so the mockup compositor can reproduce the exact
 * placement on the real blank product photo.
 *
 * Coordinate system:
 *   x / y  — offset of the design's center from the print area's center,
 *             in real print pixels (canvas display pixels × pa.scale).
 *   scale  — design's rendered width divided by print area display width.
 *             1 = design fills the full width of the print area.
 *   rotation — degrees taken from the first user object's angle.
 */
function computePrintConfig(
  canvas: { getObjects: () => unknown[] },
  pa: { x: number; y: number; displayWidth: number; displayHeight: number; scale: number },
  printAreaName: string,
): PrintConfigResult {
  const userObjs = (canvas.getObjects() as any[]).filter(
    (o) => o.name !== "__blank" && o.name !== "__printArea",
  );

  if (userObjs.length === 0) {
    return { printArea: printAreaName, x: 0, y: 0, scale: 1, rotation: 0 };
  }

  // Aggregate bounding rect across all user objects (absolute coords)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of userObjs) {
    const br = obj.getBoundingRect(true);
    minX = Math.min(minX, br.left);
    minY = Math.min(minY, br.top);
    maxX = Math.max(maxX, br.left + br.width);
    maxY = Math.max(maxY, br.top + br.height);
  }

  const designCenterX = (minX + maxX) / 2;
  const designCenterY = (minY + maxY) / 2;
  const designWidth   = maxX - minX;

  const paCenterX = pa.x + pa.displayWidth / 2;
  const paCenterY = pa.y + pa.displayHeight / 2;

  // Convert canvas-pixel offsets to real print-pixel offsets
  const x = Math.round((designCenterX - paCenterX) * pa.scale);
  const y = Math.round((designCenterY - paCenterY) * pa.scale);
  const scale = parseFloat((designWidth / pa.displayWidth).toFixed(4));
  const rotation = userObjs[0].angle ?? 0;

  return { printArea: printAreaName, x, y, scale, rotation };
}

/**
 * Export the design layer alone (no blank, no print-area overlay) at the
 * blank-photo's pixel density. The exported PNG keeps a transparent
 * background so it can be composited onto recolored blanks server-side.
 *
 * `multiplier` is clamped to [2, 6] to balance fidelity vs. payload size.
 */
function exportDesignOnly(
  canvas: { getObjects: () => unknown[]; getWidth: () => number; renderAll: () => void; toDataURL: (opts: any) => string },
  blankPxWidth: number,
): string {
  const objs = canvas.getObjects() as any[];
  const blank = objs.find((o) => o.name === '__blank');
  const printArea = objs.find((o) => o.name === '__printArea');
  const prevBlankVisible = blank?.visible;
  const prevPrintAreaVisible = printArea?.visible;
  if (blank) blank.visible = false;
  if (printArea) printArea.visible = false;
  canvas.renderAll();
  const multiplier = Math.max(2, Math.min(6, Math.round(blankPxWidth / canvas.getWidth())));
  const dataUrl = canvas.toDataURL({
    format: 'png',
    enableRetinaScaling: false,
    multiplier,
  });
  if (blank) blank.visible = prevBlankVisible;
  if (printArea) printArea.visible = prevPrintAreaVisible;
  canvas.renderAll();
  return dataUrl;
}

const PANEL_TITLES: Record<PanelTab, string> = {
  elements: "Elements",
  text: "Text",
  upload: "Upload",
  ai: "AI Tools",
  layers: "Layers",
};

export function DesignEditor({
  blankImageUrl,
  printAreas,
  designImageUrl,
  designId,
  initialLayers,
  apiBaseUrl,
  onSave,
  isSaving = false,
}: DesignEditorProps) {
  const [activePrintArea, setActivePrintArea] = useState(
    printAreas[0]?.name || "front",
  );
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cssScale, setCssScale] = useState(1);
  const [blankPxWidth, setBlankPxWidth] = useState<number>(1200);

  useEffect(() => {
    if (!blankImageUrl) return;
    const img = new Image();
    img.onload = () => setBlankPxWidth(img.naturalWidth);
    img.src = blankImageUrl;
  }, [blankImageUrl]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialImageLoaded = useRef(false);

  const { fonts, loadFont } = useGoogleFonts();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const sw = (rect.width - 16) / 800;
      const sh = (rect.height - 16) / 1000;
      setCssScale(Math.min(1, sw, sh));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const currentPrintArea = printAreas.find((p) => p.name === activePrintArea) ||
    printAreas[0] || { name: "front", widthPx: 4200, heightPx: 4800, dpi: 300 };

  const {
    canvas,
    isReady,
    error,
    displayPrintArea,
    addImageToCanvas,
    addTextToCanvas,
    deleteSelected,
  } = useFabricCanvas({
    canvasElId: "stelo-editor-canvas",
    blankImageUrl,
    printArea: currentPrintArea,
    initialLayers,
  });

  const { undo, redo, saveBaseState, canUndo, canRedo, revision } =
    useHistory(canvas);

  useEffect(() => {
    if (!isReady || !canvas || initialImageLoaded.current) return;
    initialImageLoaded.current = true;
    if (designImageUrl && !initialLayers) {
      addImageToCanvas(designImageUrl).then(() => saveBaseState());
    } else {
      saveBaseState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, canvas]);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Layer-extraction (SAM-2 click-to-extract): tracks the current source URL
  // of the design image as successive extracts produce punched-out versions.
  const [currentDesignUrl, setCurrentDesignUrl] = useState<string | null>(
    designImageUrl || null,
  );
  const [extractMode, setExtractMode] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    setCurrentDesignUrl(designImageUrl || null);
  }, [designImageUrl]);

  // While extract mode is on, treat the next canvas click as an extract
  // request. Find the topmost user image at the click point, translate the
  // pointer into image-local pixel space, call the API, then swap the
  // image's source with the punched version + add the layer alongside.
  useEffect(() => {
    if (!canvas || !extractMode || !designId) return;

    let cancelled = false;
    const handler = async (opt: { e: MouseEvent | TouchEvent }) => {
      if (cancelled || isExtracting) return;
      const fabric = await import("fabric");
      const pointer = canvas.getPointer(opt.e);
      // Find the topmost image (skip blank + printArea overlay).
      const targets = (canvas.getObjects() as any[])
        .filter(
          (o) =>
            o.type === "image" &&
            o.name !== "__blank" &&
            o.name !== "__printArea" &&
            o.containsPoint(new fabric.Point(pointer.x, pointer.y)),
        )
        .reverse();
      const target = targets[0];
      if (!target) return; // clicked empty area — no-op

      const sourceUrl: string | null =
        target.__designSource || (target === targets[0] ? currentDesignUrl : null);
      if (!sourceUrl) return;

      const localX = (pointer.x - (target.left || 0)) / (target.scaleX || 1);
      const localY = (pointer.y - (target.top || 0)) / (target.scaleY || 1);

      setIsExtracting(true);
      try {
        const res = await apiPost<{
          layerUrl: string;
          punchedUrl: string;
          bbox: { x: number; y: number; width: number; height: number };
        }>(
          `/designs/detail/${designId}/extract-layer`,
          { sourceUrl, px: Math.round(localX), py: Math.round(localY) },
        );
        if (cancelled) return;
        if (res.error || !res.data) {
          console.warn("extractLayer:", res.error);
          return;
        }
        const { layerUrl, punchedUrl, bbox } = res.data;

        // Swap the source image with the punched version, preserving
        // position/scale so the visible layout doesn't shift.
        await target.setSrc(punchedUrl, { crossOrigin: "anonymous" });
        target.__designSource = punchedUrl;
        if (target === targets[0]) setCurrentDesignUrl(punchedUrl);

        // Add the extracted layer at its bbox position, scaled to match.
        const layerImg = await fabric.FabricImage.fromURL(layerUrl, {
          crossOrigin: "anonymous",
        });
        layerImg.set({
          left: (target.left || 0) + bbox.x * (target.scaleX || 1),
          top: (target.top || 0) + bbox.y * (target.scaleY || 1),
          scaleX: target.scaleX,
          scaleY: target.scaleY,
          selectable: true,
          evented: true,
        });
        (layerImg as any).__extractedLayer = true;
        layerImg.setCoords();
        canvas.add(layerImg);
        canvas.setActiveObject(layerImg);
        canvas.requestRenderAll();
      } catch (e) {
        console.error("extractLayer failed:", e);
      } finally {
        if (!cancelled) {
          setIsExtracting(false);
          setExtractMode(false);
        }
      }
    };

    canvas.on("mouse:down", handler);
    canvas.defaultCursor = "crosshair";
    canvas.hoverCursor = "crosshair";
    return () => {
      cancelled = true;
      canvas.off("mouse:down", handler);
      canvas.defaultCursor = "default";
      canvas.hoverCursor = "move";
    };
  }, [canvas, extractMode, designId, currentDesignUrl, isExtracting]);

  const handleSave = useCallback(() => {
    if (!canvas) return;
    try {
      const layers = (canvas as any).toJSON(["name", "selectable", "evented"]);
      let exportDataUrl = "";
      let mockupDataUrl = "";
      try {
        exportDataUrl = exportAtPrintDPI(canvas, displayPrintArea);
        mockupDataUrl = exportFullCanvas(canvas);
      } catch {
        console.warn("Export failed (tainted canvas), saving layers only");
      }
      const printConfig = computePrintConfig(canvas, displayPrintArea, activePrintArea);
      let overlayDataUrl = "";
      try {
        overlayDataUrl = exportDesignOnly(canvas as any, blankPxWidth);
      } catch {
        console.warn("Design overlay export failed (tainted canvas), saving without overlay");
      }
      onSave({ printArea: activePrintArea, layers, exportDataUrl, mockupDataUrl, overlayDataUrl, printConfig });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [canvas, displayPrintArea, activePrintArea, blankPxWidth, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((mod && e.key === "y") || (mod && e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); return; }
      if (mod && e.key === "s") { e.preventDefault(); handleSave(); return; }
      if (mod && e.key === "d") {
        e.preventDefault();
        if (canvas) {
          const active = canvas.getActiveObject();
          if (active && (active as any).name !== "__blank" && (active as any).name !== "__printArea") {
            active.clone().then((cloned: any) => {
              cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
              canvas.add(cloned);
              canvas.setActiveObject(cloned);
              canvas.requestRenderAll();
            });
          }
        }
        return;
      }
      // Ctrl+A: Select all
      if (mod && e.key === "a") {
        e.preventDefault();
        if (canvas) {
          const objs = canvas.getObjects().filter((o) => {
            const n = (o as any).name;
            return n !== "__blank" && n !== "__printArea" && o.selectable;
          });
          if (objs.length > 0) {
            import("fabric").then((fabric) => {
              const sel = new fabric.ActiveSelection(objs, { canvas });
              canvas.setActiveObject(sel);
              canvas.requestRenderAll();
            });
          }
        }
        return;
      }

      // Ctrl+] / Ctrl+[: Bring forward / send backward
      if (mod && e.key === "]" && !e.shiftKey) {
        e.preventDefault();
        if (canvas) {
          const obj = canvas.getActiveObject();
          if (obj) { canvas.bringObjectForward(obj); canvas.requestRenderAll(); }
        }
        return;
      }
      if (mod && e.key === "[" && !e.shiftKey) {
        e.preventDefault();
        if (canvas) {
          const obj = canvas.getActiveObject();
          if (obj) { canvas.sendObjectBackwards(obj); canvas.requestRenderAll(); }
        }
        return;
      }

      // Ctrl+Shift+] / Ctrl+Shift+[: Bring to front / send to back
      if (mod && e.key === "]" && e.shiftKey) {
        e.preventDefault();
        if (canvas) {
          const obj = canvas.getActiveObject();
          if (obj) { canvas.bringObjectToFront(obj); canvas.requestRenderAll(); }
        }
        return;
      }
      if (mod && e.key === "[" && e.shiftKey) {
        e.preventDefault();
        if (canvas) {
          const obj = canvas.getActiveObject();
          if (obj) { canvas.sendObjectToBack(obj); canvas.requestRenderAll(); }
        }
        return;
      }

      // Ctrl+L: Lock/unlock
      if (mod && e.key === "l") {
        e.preventDefault();
        if (canvas) {
          const obj = canvas.getActiveObject();
          if (obj && (obj as any).name !== "__blank") {
            const locked = obj.selectable;
            obj.set({ selectable: !locked, evented: !locked });
            canvas.requestRenderAll();
          }
        }
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
      if (e.key === "Escape") {
        if (canvas) { canvas.discardActiveObject(); canvas.requestRenderAll(); }
        setActiveTab(null);
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
  }, [canvas, undo, redo, handleSave]);

  if (isMobile) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-6 text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">desktop_windows</span>
        <h3 className="font-bold font-headline">Desktop Required</h3>
        <p className="text-sm text-on-surface-variant">
          The design editor requires a desktop browser. Please open this page on a computer to customize your product.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-6 py-4 rounded-2xl">
        <p className="text-sm font-bold">Editor failed to load</p>
        <p className="text-xs opacity-80">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ContextualToolbar
        canvas={canvas}
        revision={revision}
        printAreaName={activePrintArea}
        fonts={fonts}
        loadFont={loadFont}
      />

      <PrintReadinessBar
        canvas={canvas}
        revision={revision}
        displayPrintArea={displayPrintArea}
      />

      <div className="flex gap-2" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
        <IconToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />

        <ExpandablePanel
          isOpen={activeTab !== null}
          title={activeTab ? PANEL_TITLES[activeTab] : ""}
          onClose={() => setActiveTab(null)}
        >
          {activeTab === "elements" && (
            <div className="space-y-3">
              {printAreas.length > 1 && (
                <div className="flex gap-1">
                  {printAreas.map((pa) => (
                    <button
                      key={pa.name}
                      onClick={() => setActivePrintArea(pa.name)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        activePrintArea === pa.name
                          ? "stellar-gradient text-white"
                          : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {pa.name}
                    </button>
                  ))}
                </div>
              )}
              <ShapesPanel onAddImage={addImageToCanvas} apiBaseUrl={apiBaseUrl} />
            </div>
          )}
          {activeTab === "text" && <TextPanel onAddText={addTextToCanvas} />}
          {activeTab === "upload" && <UploadPanel onAddImage={addImageToCanvas} />}
          {activeTab === "ai" && (
            <AiToolsPanel
              canvas={canvas}
              apiBaseUrl={apiBaseUrl}
              displayPrintArea={displayPrintArea}
              onSaveHistory={saveBaseState}
            />
          )}
          {activeTab === "layers" && (
            <LayerPanel canvas={canvas} revision={revision} onDelete={deleteSelected} />
          )}
        </ExpandablePanel>

        <div
          ref={wrapperRef}
          className="flex-1 flex items-center justify-center bg-surface-container-low rounded-2xl p-2 overflow-hidden"
        >
          {!isReady && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-on-surface-variant">Loading editor...</p>
            </div>
          )}
          <div
            style={{
              transform: `scale(${cssScale})`,
              transformOrigin: "top center",
              width: 800,
              height: 1000,
              flexShrink: 0,
            }}
            className={isReady ? "" : "hidden"}
          >
            <canvas id="stelo-editor-canvas" />
          </div>
        </div>
      </div>

      <BottomBar
        canvas={canvas}
        onSave={handleSave}
        isSaving={isSaving}
        saveStatus={saveStatus}
        extractAvailable={!!designId}
        extractMode={extractMode}
        isExtracting={isExtracting}
        onToggleExtract={() => setExtractMode((m) => !m)}
      />
    </div>
  );
}
