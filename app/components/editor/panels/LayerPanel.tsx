import { useEffect, useState, useCallback, useRef } from "react";
import type { Canvas as FabricCanvas } from "fabric";

interface LayerPanelProps {
  canvas: FabricCanvas | null;
  revision: number;
  onDelete: () => void;
}

interface LayerItem {
  index: number;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  thumbnail: string;
}

const BLEND_MODES = [
  "source-over",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
] as const;

const BLEND_LABELS: Record<string, string> = {
  "source-over": "Normal",
  multiply: "Multiply",
  screen: "Screen",
  overlay: "Overlay",
  darken: "Darken",
  lighten: "Lighten",
};

export function LayerPanel({ canvas, revision, onDelete }: LayerPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [editingName, setEditingName] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const thumbnailCache = useRef<Map<number, string>>(new Map());
  const thumbnailTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const generateThumbnail = useCallback((obj: any, index: number) => {
    if (thumbnailTimers.current.has(index)) {
      clearTimeout(thumbnailTimers.current.get(index)!);
    }
    thumbnailTimers.current.set(
      index,
      setTimeout(() => {
        try {
          const canvasEl = obj.toCanvasElement({ multiplier: 0.1 });
          const dataUrl = canvasEl.toDataURL("image/png");
          thumbnailCache.current.set(index, dataUrl);
        } catch {
          // silently fail for unsupported objects
        }
        thumbnailTimers.current.delete(index);
      }, 300),
    );
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    const items: LayerItem[] = [];
    objects.forEach((obj, i) => {
      const name = (obj as any).name || "";
      if (name === "__printArea") return;
      const isBlank = name === "__blank";

      generateThumbnail(obj, i);

      items.push({
        index: i,
        name: isBlank ? "Product Image" : name || obj.type || `Object ${i}`,
        type: obj.type || "unknown",
        visible: obj.visible !== false,
        locked: !obj.selectable || isBlank,
        opacity: Math.round((obj.opacity ?? 1) * 100),
        blendMode: (obj as any).globalCompositeOperation || "source-over",
        thumbnail: thumbnailCache.current.get(i) || "",
      });
    });
    setLayers(items.reverse());

    const active = canvas.getActiveObject();
    if (active) {
      const idx = objects.indexOf(active);
      setSelectedIndices(new Set([idx]));
    }
  }, [canvas, revision, generateThumbnail]);

  const selectLayer = useCallback(
    (index: number, e?: React.MouseEvent) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (!obj || !obj.selectable) return;

      if (e?.ctrlKey || e?.metaKey) {
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
        });
      } else if (e?.shiftKey && selectedIndices.size > 0) {
        const existing = Array.from(selectedIndices);
        const min = Math.min(...existing, index);
        const max = Math.max(...existing, index);
        const range = new Set<number>();
        for (let i = min; i <= max; i++) range.add(i);
        setSelectedIndices(range);
      } else {
        canvas.setActiveObject(obj);
        canvas.renderAll();
        setSelectedIndices(new Set([index]));
      }
    },
    [canvas, selectedIndices],
  );

  const toggleVisibility = useCallback(
    (index: number) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (obj) {
        obj.set("visible", !obj.visible);
        canvas.renderAll();
        setLayers((prev) =>
          prev.map((l) => (l.index === index ? { ...l, visible: !l.visible } : l)),
        );
      }
    },
    [canvas],
  );

  const toggleLock = useCallback(
    (index: number) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (obj && (obj as any).name !== "__blank") {
        const locked = obj.selectable;
        obj.set({ selectable: !locked, evented: !locked });
        canvas.renderAll();
        setLayers((prev) =>
          prev.map((l) => (l.index === index ? { ...l, locked } : l)),
        );
      }
    },
    [canvas],
  );

  const setOpacity = useCallback(
    (index: number, value: number) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (obj) {
        obj.set("opacity", value / 100);
        canvas.renderAll();
        setLayers((prev) =>
          prev.map((l) => (l.index === index ? { ...l, opacity: value } : l)),
        );
      }
    },
    [canvas],
  );

  const setBlendMode = useCallback(
    (index: number, mode: string) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (obj) {
        (obj as any).globalCompositeOperation = mode;
        canvas.renderAll();
        setLayers((prev) =>
          prev.map((l) => (l.index === index ? { ...l, blendMode: mode } : l)),
        );
        setContextMenu(null);
      }
    },
    [canvas],
  );

  const renameLayer = useCallback(
    (index: number, newName: string) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (obj) {
        (obj as any).name = newName;
        setLayers((prev) =>
          prev.map((l) => (l.index === index ? { ...l, name: newName } : l)),
        );
      }
      setEditingName(null);
    },
    [canvas],
  );

  const duplicateLayer = useCallback(
    (index: number) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (!obj) return;
      obj.clone().then((cloned: any) => {
        cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
        if ((obj as any).name) cloned.name = `${(obj as any).name} copy`;
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
      });
      setContextMenu(null);
    },
    [canvas],
  );

  const deleteLayer = useCallback(
    (index: number) => {
      if (!canvas) return;
      const obj = canvas.getObjects()[index];
      if (obj && (obj as any).name !== "__blank") {
        canvas.remove(obj);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
      setContextMenu(null);
    },
    [canvas],
  );

  const addShape = useCallback(
    async (type: "rect" | "circle") => {
      if (!canvas) return;
      const fabric = await import("fabric");
      let shape: any;
      if (type === "rect") {
        shape = new fabric.Rect({
          width: 100, height: 100, fill: "#6366F1",
          left: 350, top: 300, name: "Rectangle",
        });
      } else {
        shape = new fabric.Circle({
          radius: 50, fill: "#6366F1",
          left: 350, top: 300, name: "Circle",
        });
      }
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
      setShowAddMenu(false);
    },
    [canvas],
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropTarget(index);
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (!canvas || dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null);
        setDropTarget(null);
        return;
      }
      const obj = canvas.getObjects()[dragIndex];
      if (!obj) return;

      canvas.moveObjectTo(obj, targetIndex);
      canvas.requestRenderAll();
      setDragIndex(null);
      setDropTarget(null);
    },
    [canvas, dragIndex],
  );

  const getIcon = (type: string) => {
    if (type === "i-text" || type === "textbox" || type === "text") return "text_fields";
    if (type === "image") return "image";
    if (type === "group") return "folder";
    if (type === "rect") return "rectangle";
    if (type === "circle") return "circle";
    if (type === "polygon" || type === "triangle") return "change_history";
    return "layers";
  };

  const filteredLayers = searchQuery
    ? layers.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : layers;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-on-surface-variant/60 font-mono">
            {layers.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Add button */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-surface-container-high transition-colors"
              title="Add layer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-surface-container-low rounded-lg border border-outline-variant/20 shadow-xl py-1 w-36">
                <button
                  onClick={() => addShape("rect")}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-high transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">rectangle</span>
                  Rectangle
                </button>
                <button
                  onClick={() => addShape("circle")}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-high transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">circle</span>
                  Circle
                </button>
              </div>
            )}
          </div>

          {/* Search toggle */}
          <button
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
              showSearch ? "bg-primary/20 text-primary" : "hover:bg-surface-container-high"
            }`}
            title="Search layers"
          >
            <span className="material-symbols-outlined text-sm">search</span>
          </button>
        </div>
      </div>

      {/* Search input */}
      {showSearch && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter layers..."
          className="w-full bg-surface-container px-2 py-1 rounded text-xs border-0 focus:ring-1 focus:ring-primary"
          autoFocus
        />
      )}

      {/* Multi-select info */}
      {selectedIndices.size > 1 && (
        <div className="flex items-center justify-between bg-primary/10 rounded-lg px-2 py-1">
          <span className="text-[10px] text-primary font-bold">
            {selectedIndices.size} layers selected
          </span>
          <button
            onClick={onDelete}
            className="text-[10px] text-red-400 hover:text-red-300"
          >
            Delete all
          </button>
        </div>
      )}

      {/* Layer list */}
      {filteredLayers.length === 0 ? (
        <p className="text-xs text-on-surface-variant/60 text-center py-4">
          {searchQuery ? `No layers matching "${searchQuery}"` : "No objects yet"}
        </p>
      ) : (
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
          {filteredLayers.map((layer) => (
            <div
              key={layer.index}
              draggable={!layer.locked}
              onDragStart={() => handleDragStart(layer.index)}
              onDragOver={(e) => handleDragOver(e, layer.index)}
              onDrop={() => handleDrop(layer.index)}
              onDragEnd={() => { setDragIndex(null); setDropTarget(null); }}
              onClick={(e) => selectLayer(layer.index, e)}
              className={`group rounded-lg text-xs transition-colors ${
                dropTarget === layer.index ? "border-t-2 border-primary" : ""
              } ${
                selectedIndices.has(layer.index)
                  ? "bg-primary/20 border-l-2 border-primary"
                  : "hover:bg-surface-container-high"
              }`}
            >
              {/* Main row */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer">
                {/* Visibility */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.index); }}
                  className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
                  title={layer.visible ? "Hide" : "Show"}
                >
                  <span className="material-symbols-outlined text-sm">
                    {layer.visible ? "visibility" : "visibility_off"}
                  </span>
                </button>

                {/* Thumbnail */}
                <div className="w-8 h-8 rounded bg-surface-container flex-shrink-0 flex items-center justify-center overflow-hidden cursor-grab">
                  {layer.thumbnail ? (
                    <img src={layer.thumbnail} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="material-symbols-outlined text-sm opacity-40">
                      {getIcon(layer.type)}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {editingName === layer.index ? (
                    <input
                      type="text"
                      defaultValue={layer.name}
                      onBlur={(e) => renameLayer(layer.index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameLayer(layer.index, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      className="w-full bg-surface-container px-1 py-0.5 rounded text-xs border-0 focus:ring-1 focus:ring-primary"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="truncate block"
                      onDoubleClick={(e) => { e.stopPropagation(); setEditingName(layer.index); }}
                    >
                      {layer.name}
                    </span>
                  )}
                  {layer.blendMode !== "source-over" && (
                    <span className="text-[9px] text-primary/70">
                      {BLEND_LABELS[layer.blendMode] || layer.blendMode}
                    </span>
                  )}
                </div>

                {/* Lock */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLock(layer.index); }}
                  className={`flex-shrink-0 transition-opacity ${
                    layer.locked ? "opacity-60" : "opacity-0 group-hover:opacity-40 hover:!opacity-100"
                  }`}
                  title={layer.locked ? "Unlock" : "Lock"}
                >
                  <span className="material-symbols-outlined text-sm">
                    {layer.locked ? "lock" : "lock_open"}
                  </span>
                </button>

                {/* Context menu trigger */}
                {!layer.locked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setContextMenu({ index: layer.index, x: rect.right, y: rect.bottom });
                    }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0"
                    title="More options"
                  >
                    <span className="material-symbols-outlined text-sm">more_vert</span>
                  </button>
                )}
              </div>

              {/* Inline opacity slider */}
              {selectedIndices.has(layer.index) && !layer.locked && (
                <div className="flex items-center gap-1.5 px-2 pb-1.5">
                  <span className="text-[9px] text-on-surface-variant/60 w-7">
                    {layer.opacity}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layer.opacity}
                    onChange={(e) => setOpacity(layer.index, parseInt(e.target.value, 10))}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 h-1 accent-primary"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete selected */}
      {selectedIndices.size === 1 && (
        <button
          onClick={onDelete}
          className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          Delete Selected
        </button>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-40 bg-surface-container-low rounded-lg border border-outline-variant/20 shadow-xl py-1 w-40"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 170), top: contextMenu.y }}
          >
            <button
              onClick={() => duplicateLayer(contextMenu.index)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-high transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              Duplicate
            </button>
            <button
              onClick={() => { setEditingName(contextMenu.index); setContextMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-high transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Rename
            </button>
            <div className="h-px bg-outline-variant/20 my-1" />
            <div className="px-3 py-1 text-[9px] text-on-surface-variant/60 uppercase tracking-wider">
              Blend Mode
            </div>
            {BLEND_MODES.map((mode) => {
              const layer = layers.find((l) => l.index === contextMenu.index);
              return (
                <button
                  key={mode}
                  onClick={() => setBlendMode(contextMenu.index, mode)}
                  className={`w-full text-left px-3 py-1 text-xs transition-colors flex items-center gap-2 ${
                    layer?.blendMode === mode
                      ? "text-primary font-bold bg-primary/10"
                      : "hover:bg-surface-container-high"
                  }`}
                >
                  {BLEND_LABELS[mode]}
                </button>
              );
            })}
            <div className="h-px bg-outline-variant/20 my-1" />
            <button
              onClick={() => deleteLayer(contextMenu.index)}
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
