import { useState, useCallback, useRef, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface AiToolsPanelProps {
  canvas: FabricCanvas | null;
  apiBaseUrl: string;
  displayPrintArea: {
    x: number;
    y: number;
    displayWidth: number;
    displayHeight: number;
    widthPx: number;
    heightPx: number;
    dpi: number;
    scale: number;
  };
  onSaveHistory: () => void;
}

type AiTool = "enhance" | "removebg" | "generate" | "upscale" | null;
type ProcessingState = "idle" | "processing" | "success" | "error";

export function AiToolsPanel({
  canvas,
  apiBaseUrl,
  displayPrintArea,
  onSaveHistory,
}: AiToolsPanelProps) {
  const [activeTool, setActiveTool] = useState<AiTool>(null);
  const [state, setState] = useState<ProcessingState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Enhance settings
  const [enhanceTarget, setEnhanceTarget] = useState<"all" | "selected">("all");
  const [enhanceStrength, setEnhanceStrength] = useState(30);
  const [enhancePrompt, setEnhancePrompt] = useState("");

  // Generate settings
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateStyle, setGenerateStyle] = useState("pod-ready");
  const [generateBg, setGenerateBg] = useState<"transparent" | "white">("transparent");

  // Upscale settings
  const [upscaleScale, setUpscaleScale] = useState<"2x" | "4x">("2x");

  const startTimer = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const getSelectedImageBase64 = useCallback((): string | null => {
    if (!canvas) return null;
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== "image") return null;
    try {
      const el = (obj as any).toCanvasElement({ multiplier: 2 });
      return el.toDataURL("image/png").split(",")[1];
    } catch { return null; }
  }, [canvas]);

  const getDesignBase64 = useCallback((): string => {
    if (!canvas) return "";
    try {
      const { x, y, displayWidth, displayHeight } = displayPrintArea;
      return canvas.toDataURL({
        left: x, top: y,
        width: displayWidth, height: displayHeight,
        format: "png", multiplier: 2,
      }).split(",")[1];
    } catch { return ""; }
  }, [canvas, displayPrintArea]);

  const addImageToCanvas = useCallback(
    async (dataUrl: string) => {
      if (!canvas) return;
      const fabric = await import("fabric");
      const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
      const scale = Math.min(
        displayPrintArea.displayWidth / (img.width || 1),
        displayPrintArea.displayHeight / (img.height || 1),
      ) * 0.8;
      img.set({
        scaleX: scale, scaleY: scale,
        left: displayPrintArea.x + (displayPrintArea.displayWidth - (img.width || 1) * scale) / 2,
        top: displayPrintArea.y + (displayPrintArea.displayHeight - (img.height || 1) * scale) / 2,
        name: "ai-result", selectable: true, evented: true,
      });
      img.setCoords();
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    },
    [canvas, displayPrintArea],
  );

  const handleEnhance = useCallback(async () => {
    if (!canvas || !apiBaseUrl) return;
    onSaveHistory();
    setState("processing");
    setErrorMsg("");
    startTimer();
    abortRef.current = new AbortController();

    try {
      const base64 = enhanceTarget === "selected" ? getSelectedImageBase64() : getDesignBase64();
      if (!base64) throw new Error("No design to enhance");

      const ratio = displayPrintArea.widthPx / displayPrintArea.heightPx;
      // Route through the Remix server-side proxy: /api/clipart/ai-enhance.
      // The browser can't auth directly to the API anymore — the proxy
      // route attaches the wallet from the session and the proxy secret
      // from process.env (server-only).
      const res = await fetch(`/api/clipart/ai-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          strength: enhanceStrength / 100,
          prompt: enhancePrompt || undefined,
          aspectRatio: ratio,
          productType: "product",
          printMethod: "DTG",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Enhancement failed: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.imageUrl) await addImageToCanvas(data.imageUrl);
      setState("success");
    } catch (err: any) {
      if (err.name === "AbortError") { setState("idle"); return; }
      setErrorMsg(err.message || "Enhancement failed");
      setState("error");
    } finally {
      stopTimer();
    }
  }, [canvas, apiBaseUrl, enhanceTarget, enhanceStrength, enhancePrompt, displayPrintArea, onSaveHistory, startTimer, stopTimer, getSelectedImageBase64, getDesignBase64, addImageToCanvas]);

  const handleRemoveBg = useCallback(async () => {
    if (!canvas || !apiBaseUrl) return;
    const base64 = getSelectedImageBase64();
    if (!base64) { setErrorMsg("Select an image layer first"); setState("error"); return; }

    onSaveHistory();
    setState("processing");
    setErrorMsg("");
    startTimer();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/clipart/ai-remove-bg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`Remove BG failed: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.imageUrl) {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === "image") {
          const fabric = await import("fabric");
          const newImg = await fabric.FabricImage.fromURL(data.imageUrl, { crossOrigin: "anonymous" });
          newImg.set({
            left: obj.left, top: obj.top,
            scaleX: obj.scaleX, scaleY: obj.scaleY,
            angle: obj.angle, name: (obj as any).name || "bg-removed",
            selectable: true, evented: true,
          });
          newImg.setCoords();
          canvas.remove(obj);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.requestRenderAll();
        }
      }
      setState("success");
    } catch (err: any) {
      if (err.name === "AbortError") { setState("idle"); return; }
      setErrorMsg(err.message || "Remove BG failed");
      setState("error");
    } finally { stopTimer(); }
  }, [canvas, apiBaseUrl, onSaveHistory, startTimer, stopTimer, getSelectedImageBase64]);

  const handleGenerate = useCallback(async () => {
    if (!apiBaseUrl || !generatePrompt.trim()) return;
    onSaveHistory();
    setState("processing");
    setErrorMsg("");
    startTimer();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/clipart/ai-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatePrompt,
          style: generateStyle,
          transparentBg: generateBg === "transparent",
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.imageUrl) await addImageToCanvas(data.imageUrl);
      setState("success");
    } catch (err: any) {
      if (err.name === "AbortError") { setState("idle"); return; }
      setErrorMsg(err.message || "Generation failed");
      setState("error");
    } finally { stopTimer(); }
  }, [apiBaseUrl, generatePrompt, generateStyle, generateBg, onSaveHistory, startTimer, stopTimer, addImageToCanvas]);

  const handleUpscale = useCallback(async () => {
    if (!canvas || !apiBaseUrl) return;
    const base64 = getSelectedImageBase64();
    if (!base64) { setErrorMsg("Select an image layer first"); setState("error"); return; }

    onSaveHistory();
    setState("processing");
    setErrorMsg("");
    startTimer();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/clipart/ai-upscale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, scale: upscaleScale }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`Upscale failed: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.imageUrl) {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === "image") {
          const fabric = await import("fabric");
          const newImg = await fabric.FabricImage.fromURL(data.imageUrl, { crossOrigin: "anonymous" });
          newImg.set({
            left: obj.left, top: obj.top,
            scaleX: obj.scaleX, scaleY: obj.scaleY,
            angle: obj.angle, name: (obj as any).name || "upscaled",
            selectable: true, evented: true,
          });
          newImg.setCoords();
          canvas.remove(obj);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.requestRenderAll();
        }
      }
      setState("success");
    } catch (err: any) {
      if (err.name === "AbortError") { setState("idle"); return; }
      setErrorMsg(err.message || "Upscale failed");
      setState("error");
    } finally { stopTimer(); }
  }, [canvas, apiBaseUrl, upscaleScale, onSaveHistory, startTimer, stopTimer, getSelectedImageBase64]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    stopTimer();
    setState("idle");
  }, [stopTimer]);

  const tools = [
    { id: "enhance" as const, icon: "auto_awesome", label: "Enhance Design", desc: "Improve quality" },
    { id: "removebg" as const, icon: "content_cut", label: "Remove BG", desc: "Transparent background" },
    { id: "generate" as const, icon: "brush", label: "Generate", desc: "From text prompt" },
    { id: "upscale" as const, icon: "zoom_in", label: "Upscale", desc: "Increase resolution" },
  ];

  // Processing overlay
  if (state === "processing") {
    return (
      <div className="space-y-3 text-center py-6">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-xs text-on-surface-variant">Processing... ({elapsed}s)</p>
        <button
          onClick={handleCancel}
          className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Success message
  if (state === "success") {
    return (
      <div className="space-y-3 text-center py-6">
        <span className="material-symbols-outlined text-3xl text-green-400">check_circle</span>
        <p className="text-xs text-green-400 font-bold">Done! Added as new layer</p>
        <button
          onClick={() => { setState("idle"); setActiveTool(null); }}
          className="text-xs text-primary hover:underline"
        >
          Back to tools
        </button>
      </div>
    );
  }

  // Error message
  if (state === "error") {
    return (
      <div className="space-y-3 text-center py-6">
        <span className="material-symbols-outlined text-3xl text-red-400">error</span>
        <p className="text-xs text-red-400">{errorMsg}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setState("idle")}
            className="text-xs text-primary hover:underline"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Tool cards (no tool selected)
  if (!activeTool) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="bg-surface-container-high hover:bg-surface-container-highest rounded-xl p-4 text-center transition-colors group"
          >
            <span className="material-symbols-outlined text-2xl text-primary group-hover:scale-110 transition-transform block mb-1">
              {tool.icon}
            </span>
            <p className="text-xs font-bold">{tool.label}</p>
            <p className="text-[9px] text-on-surface-variant/60 mt-0.5">{tool.desc}</p>
          </button>
        ))}
      </div>
    );
  }

  // Enhance tool
  if (activeTool === "enhance") {
    return (
      <div className="space-y-3">
        <button onClick={() => setActiveTool(null)} className="text-xs text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back
        </button>
        <h4 className="text-xs font-bold uppercase tracking-wider">Enhance Design</h4>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Target</p>
          <div className="flex gap-2">
            {(["all", "selected"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setEnhanceTarget(t)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  enhanceTarget === t ? "bg-primary/20 text-primary" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {t === "all" ? "All layers" : "Selected only"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Strength: {enhanceStrength}%</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-on-surface-variant/60">Subtle</span>
            <input type="range" min={10} max={90} value={enhanceStrength}
              onChange={(e) => setEnhanceStrength(parseInt(e.target.value, 10))}
              className="flex-1 h-1 accent-primary" />
            <span className="text-[9px] text-on-surface-variant/60">Creative</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Prompt (optional)</p>
          <input type="text" value={enhancePrompt} onChange={(e) => setEnhancePrompt(e.target.value)}
            placeholder="Enhance for crisp DTG printing"
            className="w-full bg-surface-container px-2 py-1.5 rounded text-xs border-0 focus:ring-1 focus:ring-primary" />
        </div>

        <button onClick={handleEnhance}
          className="w-full stellar-gradient text-white px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          Enhance
        </button>
      </div>
    );
  }

  // Remove BG tool
  if (activeTool === "removebg") {
    const hasImageSelected = canvas?.getActiveObject()?.type === "image";
    return (
      <div className="space-y-3">
        <button onClick={() => setActiveTool(null)} className="text-xs text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back
        </button>
        <h4 className="text-xs font-bold uppercase tracking-wider">Remove Background</h4>
        <p className="text-xs text-on-surface-variant">
          {hasImageSelected ? "Ready to remove background from selected image." : "Select an image layer first."}
        </p>
        <button onClick={handleRemoveBg} disabled={!hasImageSelected}
          className="w-full stellar-gradient text-white px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm">content_cut</span>
          Remove Background
        </button>
      </div>
    );
  }

  // Generate tool
  if (activeTool === "generate") {
    return (
      <div className="space-y-3">
        <button onClick={() => setActiveTool(null)} className="text-xs text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back
        </button>
        <h4 className="text-xs font-bold uppercase tracking-wider">Generate from Text</h4>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Prompt</p>
          <input type="text" value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)}
            placeholder="retro sunset with palm trees"
            className="w-full bg-surface-container px-2 py-1.5 rounded text-xs border-0 focus:ring-1 focus:ring-primary" />
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Style</p>
          <select value={generateStyle} onChange={(e) => setGenerateStyle(e.target.value)}
            className="w-full bg-surface-container px-2 py-1.5 rounded text-xs border-0 focus:ring-1 focus:ring-primary">
            <option value="pod-ready">POD-ready</option>
            <option value="vintage">Vintage</option>
            <option value="minimalist">Minimalist</option>
            <option value="watercolor">Watercolor</option>
            <option value="line-art">Line Art</option>
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Background</p>
          <div className="flex gap-2">
            {(["transparent", "white"] as const).map((bg) => (
              <button key={bg} onClick={() => setGenerateBg(bg)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                  generateBg === bg ? "bg-primary/20 text-primary" : "bg-surface-container text-on-surface-variant"
                }`}>
                {bg}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleGenerate} disabled={!generatePrompt.trim()}
          className="w-full stellar-gradient text-white px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm">brush</span>
          Generate
        </button>
      </div>
    );
  }

  // Upscale tool
  if (activeTool === "upscale") {
    const hasImageSelected = canvas?.getActiveObject()?.type === "image";
    return (
      <div className="space-y-3">
        <button onClick={() => setActiveTool(null)} className="text-xs text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back
        </button>
        <h4 className="text-xs font-bold uppercase tracking-wider">Upscale Image</h4>
        <p className="text-xs text-on-surface-variant">
          {hasImageSelected ? "Ready to upscale selected image." : "Select an image layer first."}
        </p>

        <div className="space-y-1">
          <p className="text-[10px] text-on-surface-variant">Scale</p>
          <div className="flex gap-2">
            {(["2x", "4x"] as const).map((s) => (
              <button key={s} onClick={() => setUpscaleScale(s)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                  upscaleScale === s ? "bg-primary/20 text-primary" : "bg-surface-container text-on-surface-variant"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleUpscale} disabled={!hasImageSelected}
          className="w-full stellar-gradient text-white px-3 py-2 rounded-lg text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm">zoom_in</span>
          Upscale
        </button>
      </div>
    );
  }

  return null;
}
