import { useState, useCallback, useEffect, useRef } from "react";
import { useFabricCanvas } from "./hooks/useFabricCanvas";
import { useHistory } from "./hooks/useHistory";
import { exportAtPrintDPI } from "./utils/export";
import { EditorToolbar } from "./EditorToolbar";
import { LayerPanel } from "./panels/LayerPanel";
import { TextPanel } from "./panels/TextPanel";
import { ShapesPanel } from "./panels/ShapesPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";

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

type SideTab = "clipart" | "text" | "layers";

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
  const [sideTab, setSideTab] = useState<SideTab>("clipart");
  const [isMobile, setIsMobile] = useState(false);
  const [cssScale, setCssScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialImageLoaded = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // CSS-based responsive scaling
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const available = rect.width - 16; // padding
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

  // Load initial design image ONCE
  useEffect(() => {
    if (!isReady || !canvas || initialImageLoaded.current) return;
    initialImageLoaded.current = true;

    if (designImageUrl && !initialLayers) {
      addImageToCanvas(designImageUrl).then(() => {
        saveBaseState();
      });
    } else {
      saveBaseState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, canvas]);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const handleSave = useCallback(() => {
    if (!canvas) return;
    try {
      const layers = (canvas as any).toJSON(["name", "selectable", "evented"]);
      let exportDataUrl = "";
      try {
        exportDataUrl = exportAtPrintDPI(canvas, displayPrintArea);
      } catch {
        // Canvas tainted by cross-origin images — save layers without export
        console.warn("Export failed (tainted canvas), saving layers only");
      }
      onSave({
        printArea: activePrintArea,
        layers,
        exportDataUrl,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [canvas, displayPrintArea, activePrintArea, onSave]);

  const handleAiEnhance = useCallback(async () => {
    if (!canvas) return;
    setIsEnhancing(true);
    try {
      const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 1 });
      const base64 = dataUrl.split(",")[1];

      const res = await fetch(`${apiBaseUrl}/clipart/ai-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          prompt:
            "highly detailed, professional vector illustration, smooth lines, flat design, print-ready, cohesive art style",
          strength: 0.5,
          upscale: "2x",
        }),
      });

      if (!res.ok) throw new Error("AI enhance failed");
      const data = await res.json();

      if (data.imageUrl) {
        const fabric = await import("fabric");
        const aiImg = await fabric.FabricImage.fromURL(data.imageUrl, {
          crossOrigin: "anonymous",
        });
        const scale = Math.min(
          displayPrintArea.displayWidth / (aiImg.width || 1),
          displayPrintArea.displayHeight / (aiImg.height || 1),
        );
        aiImg.set({
          scaleX: scale,
          scaleY: scale,
          left:
            displayPrintArea.x +
            (displayPrintArea.displayWidth - (aiImg.width || 1) * scale) / 2,
          top:
            displayPrintArea.y +
            (displayPrintArea.displayHeight - (aiImg.height || 1) * scale) / 2,
          name: "ai-enhanced",
          selectable: true,
          evented: true,
        });
        aiImg.setCoords();

        const toRemove = canvas
          .getObjects()
          .filter(
            (o) =>
              (o as any).name !== "__blank" &&
              (o as any).name !== "__printArea",
          );
        toRemove.forEach((o) => canvas.remove(o));

        canvas.add(aiImg);
        canvas.setActiveObject(aiImg);
        canvas.requestRenderAll();
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "AI enhancement failed. Try again.",
      );
    } finally {
      setIsEnhancing(false);
    }
  }, [canvas, apiBaseUrl, displayPrintArea]);

  if (isMobile) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-6 text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
          desktop_windows
        </span>
        <h3 className="font-bold font-headline">Desktop Required</h3>
        <p className="text-sm text-on-surface-variant">
          The design editor requires a desktop browser. Please open this page on
          a computer to customize your product.
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
    <div className="space-y-3">
      <EditorToolbar
        canvas={canvas}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onAiEnhance={handleAiEnhance}
        isEnhancing={isEnhancing}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />

      <div className="flex gap-3">
        {/* Left sidebar */}
        <div className="w-[220px] flex-shrink-0 bg-surface-container-low rounded-2xl p-3 space-y-3">
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

          <div className="flex gap-1 bg-surface-container rounded-lg p-0.5">
            {(
              [
                { id: "clipart", icon: "palette", label: "Clipart" },
                { id: "text", icon: "text_fields", label: "Text" },
                { id: "layers", icon: "layers", label: "Layers" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSideTab(tab.id)}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                  sideTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-xs">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          {sideTab === "clipart" && (
            <ShapesPanel
              onAddImage={addImageToCanvas}
              apiBaseUrl={apiBaseUrl}
            />
          )}
          {sideTab === "text" && <TextPanel onAddText={addTextToCanvas} />}
          {sideTab === "layers" && (
            <LayerPanel
              canvas={canvas}
              revision={revision}
              onDelete={deleteSelected}
            />
          )}
        </div>

        {/* Center: Canvas — CSS scaled to fit */}
        <div
          ref={wrapperRef}
          className="flex-1 flex items-center justify-center bg-surface-container-low rounded-2xl p-2 overflow-hidden"
        >
          {!isReady && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-on-surface-variant">
                Loading editor...
              </p>
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

        {/* Right: Properties */}
        <div className="w-[220px] flex-shrink-0 bg-surface-container-low rounded-2xl p-3">
          <PropertiesPanel canvas={canvas} revision={revision} />
        </div>
      </div>
    </div>
  );
}
