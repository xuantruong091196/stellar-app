import { useEffect, useState, useCallback } from "react";
import type { Canvas as FabricCanvas, FabricObject } from "fabric";

interface LayerPanelProps {
  canvas: FabricCanvas | null;
  revision: number; // from useHistory, triggers re-render
  onDelete: () => void;
}

interface LayerItem {
  index: number;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
}

export function LayerPanel({ canvas, revision, onDelete }: LayerPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Rebuild layer list whenever canvas changes
  useEffect(() => {
    if (!canvas) return;
    const objects = canvas.getObjects();
    const items: LayerItem[] = [];
    objects.forEach((obj, i) => {
      const name = (obj as any).name || "";
      if (name === "__blank" || name === "__printArea") return;
      items.push({
        index: i,
        name: name || obj.type || `Object ${i}`,
        type: obj.type || "unknown",
        visible: obj.visible !== false,
        locked: !obj.selectable,
      });
    });
    setLayers(items.reverse()); // Top layers first

    const active = canvas.getActiveObject();
    if (active) {
      const idx = objects.indexOf(active);
      setSelectedIndex(idx);
    }
  }, [canvas, revision]);

  const selectLayer = useCallback(
    (index: number) => {
      if (!canvas) return;
      const obj = canvas.item(index);
      if (obj) {
        canvas.setActiveObject(obj);
        canvas.renderAll();
        setSelectedIndex(index);
      }
    },
    [canvas],
  );

  const toggleVisibility = useCallback(
    (index: number) => {
      if (!canvas) return;
      const obj = canvas.item(index);
      if (obj) {
        obj.set("visible", !obj.visible);
        canvas.renderAll();
        setLayers((prev) =>
          prev.map((l) =>
            l.index === index ? { ...l, visible: !l.visible } : l,
          ),
        );
      }
    },
    [canvas],
  );

  const moveLayer = useCallback(
    (index: number, direction: "up" | "down") => {
      if (!canvas) return;
      const obj = canvas.item(index);
      if (!obj) return;
      if (direction === "up") {
        canvas.bringObjectForward(obj);
      } else {
        canvas.sendObjectBackwards(obj);
      }
      canvas.renderAll();
    },
    [canvas],
  );

  const getIcon = (type: string) => {
    if (type === "i-text" || type === "textbox" || type === "text") return "text_fields";
    if (type === "image") return "image";
    if (type === "group") return "folder";
    if (type === "rect" || type === "circle" || type === "polygon") return "category";
    return "layers";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Layers
        </h3>
        <span className="text-[10px] text-on-surface-variant/60 font-mono">
          {layers.length}
        </span>
      </div>

      {layers.length === 0 ? (
        <p className="text-xs text-on-surface-variant/60 text-center py-4">
          No objects yet
        </p>
      ) : (
        <div className="space-y-0.5 max-h-[250px] overflow-y-auto">
          {layers.map((layer) => (
            <div
              key={layer.index}
              onClick={() => selectLayer(layer.index)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                selectedIndex === layer.index
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-sm opacity-60">
                {getIcon(layer.type)}
              </span>
              <span className="flex-1 truncate">{layer.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(layer.index);
                }}
                className="opacity-40 hover:opacity-100 transition-opacity"
                title={layer.visible ? "Hide" : "Show"}
              >
                <span className="material-symbols-outlined text-sm">
                  {layer.visible ? "visibility" : "visibility_off"}
                </span>
              </button>
              <div className="flex flex-col -space-y-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.index, "up");
                  }}
                  className="opacity-30 hover:opacity-100 text-[10px]"
                >
                  ▲
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.index, "down");
                  }}
                  className="opacity-30 hover:opacity-100 text-[10px]"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIndex !== null && (
        <button
          onClick={onDelete}
          className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          Delete Selected
        </button>
      )}
    </div>
  );
}
