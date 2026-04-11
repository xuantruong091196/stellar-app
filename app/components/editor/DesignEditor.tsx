import { useState, useCallback, useEffect, useRef } from "react";
import { useFabricCanvas } from "./hooks/useFabricCanvas";
import { useHistory } from "./hooks/useHistory";
import { useGoogleFonts } from "./hooks/useGoogleFonts";
import { exportAtPrintDPI } from "./utils/export";
import { IconToolbar } from "./IconToolbar";
import type { PanelTab } from "./IconToolbar";
import { ExpandablePanel } from "./ExpandablePanel";
import { BottomBar } from "./BottomBar";
import { ContextualToolbar } from "./ContextualToolbar";
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

interface DesignEditorProps {
  blankImageUrl: string;
  printAreas: PrintAreaDef[];
  designImageUrl?: string;
  initialLayers?: object | null;
  apiBaseUrl: string;
  onSave: (data: {
    printArea: string;
    layers: object;
    exportDataUrl: string;
  }) => void;
  isSaving?: boolean;
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
      const available = rect.width - 16;
      const s = Math.min(1, available / 800);
      setCssScale(s);
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

  const handleSave = useCallback(() => {
    if (!canvas) return;
    try {
      const layers = (canvas as any).toJSON(["name", "selectable", "evented"]);
      let exportDataUrl = "";
      try {
        exportDataUrl = exportAtPrintDPI(canvas, displayPrintArea);
      } catch {
        console.warn("Export failed (tainted canvas), saving layers only");
      }
      onSave({ printArea: activePrintArea, layers, exportDataUrl });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [canvas, displayPrintArea, activePrintArea, onSave]);

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

      <div className="flex gap-2" style={{ height: "calc(100vh - 180px)", minHeight: 500 }}>
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
              height: 700,
              flexShrink: 0,
            }}
            className={isReady ? "" : "hidden"}
          >
            <canvas id="stelo-editor-canvas" />
          </div>
        </div>
      </div>

      <BottomBar canvas={canvas} onSave={handleSave} isSaving={isSaving} saveStatus={saveStatus} />
    </div>
  );
}
