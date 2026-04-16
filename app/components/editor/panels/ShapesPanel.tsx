import { useState, useCallback, useEffect, useRef } from "react";

interface ClipartItem {
  id: string;
  title: string;
  previewUrl: string;
  downloadUrl: string;
}

interface ShapesPanelProps {
  onAddImage: (url: string) => void;
  apiBaseUrl: string;
}

const CATEGORIES = [
  { label: "Popular", query: "trending sticker" },
  { label: "Animals", query: "cute animal sticker" },
  { label: "Flowers", query: "floral wreath vector" },
  { label: "Food", query: "food illustration flat" },
  { label: "Sports", query: "sport icon flat" },
  { label: "Quotes", query: "decorative text frame" },
  { label: "Skulls", query: "skull tattoo design" },
  { label: "Hearts", query: "heart love decoration" },
  { label: "Arrows", query: "arrow decorative vector" },
  { label: "Badges", query: "badge emblem vintage" },
  { label: "Frames", query: "decorative frame border" },
];

const STYLES = [
  { label: "All", suffix: "" },
  { label: "Flat", suffix: " flat design" },
  { label: "Outline", suffix: " outline" },
  { label: "3D", suffix: " 3d render" },
  { label: "Hand-drawn", suffix: " hand drawn sketch" },
];

type SubTab = "curated" | "search" | "shapes";

export function ShapesPanel({ onAddImage, apiBaseUrl }: ShapesPanelProps) {
  const [subTab, setSubTab] = useState<SubTab>("curated");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeStyle, setActiveStyle] = useState(STYLES[0]);
  const [items, setItems] = useState<ClipartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string, p: number, append: boolean = false) => {
      if (!q.trim() || !apiBaseUrl) {
        if (!append) setItems([]);
        return;
      }
      setLoading(true);
      try {
        // Server-side proxy: /api/clipart/search forwards to the API
        // with the wallet session + proxy secret attached.
        const res = await fetch(
          `/api/clipart/search?q=${encodeURIComponent(q)}&page=${p}&limit=24`,
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (data.error) {
          if (!append) setItems([]);
          setHasMore(false);
          return;
        }
        if (append) {
          setItems((prev) => [...prev, ...(data.items || [])]);
        } else {
          setItems(data.items || []);
        }
        setHasMore(data.hasMore || false);
      } catch {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl],
  );

  // Load curated category
  useEffect(() => {
    if (subTab !== "curated") return;
    setPage(1);
    setItems([]);
    search(activeCategory.query + activeStyle.suffix, 1);
  }, [subTab, activeCategory, activeStyle, search]);

  // Debounced free search
  useEffect(() => {
    if (subTab !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setItems([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setPage(1);
      search(searchQuery + activeStyle.suffix, 1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [subTab, searchQuery, activeStyle, search]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          const q =
            subTab === "curated"
              ? activeCategory.query + activeStyle.suffix
              : searchQuery + activeStyle.suffix;
          search(q, nextPage, true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, page, subTab, activeCategory, activeStyle, searchQuery, search]);

  const handleAddShape = useCallback(
    async (type: string) => {
      // Shapes are handled by creating Fabric objects directly
      // We need the canvas reference, but ShapesPanel only has onAddImage
      // For built-in shapes, we create an SVG data URL
      const svgShapes: Record<string, string> = {
        rectangle: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#6366F1"/></svg>`,
        circle: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="100" fill="#6366F1"/></svg>`,
        triangle: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><polygon points="100,0 200,200 0,200" fill="#6366F1"/></svg>`,
        star: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><polygon points="100,10 40,198 190,78 10,78 160,198" fill="#6366F1"/></svg>`,
        heart: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M100 180 C20 120 0 80 40 40 C60 20 90 30 100 50 C110 30 140 20 160 40 C200 80 180 120 100 180Z" fill="#EC4899"/></svg>`,
        arrow: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><polygon points="150,0 200,50 150,100 150,70 0,70 0,30 150,30" fill="#6366F1"/></svg>`,
        line: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20"><line x1="0" y1="10" x2="200" y2="10" stroke="#6366F1" stroke-width="4"/></svg>`,
        hexagon: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="174"><polygon points="50,0 150,0 200,87 150,174 50,174 0,87" fill="#6366F1"/></svg>`,
      };
      const svg = svgShapes[type];
      if (svg) {
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        onAddImage(url);
      }
    },
    [onAddImage],
  );

  const SHAPES = [
    { id: "rectangle", icon: "rectangle", label: "Rectangle" },
    { id: "circle", icon: "circle", label: "Circle" },
    { id: "triangle", icon: "change_history", label: "Triangle" },
    { id: "star", icon: "star", label: "Star" },
    { id: "heart", icon: "favorite", label: "Heart" },
    { id: "arrow", icon: "arrow_forward", label: "Arrow" },
    { id: "line", icon: "horizontal_rule", label: "Line" },
    { id: "hexagon", icon: "hexagon", label: "Polygon" },
  ];

  return (
    <div className="space-y-3">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-0.5">
        {(
          [
            { id: "curated", label: "Curated" },
            { id: "search", label: "Search" },
            { id: "shapes", label: "Shapes" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
              subTab === tab.id
                ? "bg-primary/20 text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Curated tab */}
      {subTab === "curated" && (
        <>
          {/* Category chips */}
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  activeCategory.label === cat.label
                    ? "bg-primary/20 text-primary"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Style filter */}
          <div className="flex gap-1">
            {STYLES.map((style) => (
              <button
                key={style.label}
                onClick={() => setActiveStyle(style)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                  activeStyle.label === style.label
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Search tab */}
      {subTab === "search" && (
        <>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clipart..."
              className="w-full bg-surface-container pl-8 pr-3 py-2 rounded-lg text-xs border-0 focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Style filter for search too */}
          <div className="flex gap-1">
            {STYLES.map((style) => (
              <button
                key={style.label}
                onClick={() => setActiveStyle(style)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                  activeStyle.label === style.label
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Shapes tab */}
      {subTab === "shapes" && (
        <div className="grid grid-cols-4 gap-1.5">
          {SHAPES.map((shape) => (
            <button
              key={shape.id}
              onClick={() => handleAddShape(shape.id)}
              className="aspect-square rounded-lg bg-surface-container-high hover:bg-surface-container-highest p-2 transition-colors flex flex-col items-center justify-center gap-1"
              title={shape.label}
            >
              <span className="material-symbols-outlined text-xl text-on-surface-variant">
                {shape.icon}
              </span>
              <span className="text-[9px] text-on-surface-variant/60">
                {shape.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Clipart grid (curated + search) */}
      {subTab !== "shapes" && (
        <>
          {loading && items.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5 max-h-[350px] overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onAddImage(item.previewUrl || item.downloadUrl)}
                className="aspect-square rounded-lg bg-surface-container-high hover:bg-surface-container-highest p-1.5 transition-colors group"
                title={item.title}
              >
                <img
                  src={item.previewUrl}
                  alt={item.title}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </button>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="col-span-4 h-1" />
          </div>

          {loading && items.length > 0 && (
            <div className="flex items-center justify-center py-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading && items.length === 0 && subTab === "search" && searchQuery.trim() && (
            <p className="text-xs text-on-surface-variant text-center py-4">
              No results for "{searchQuery}"
            </p>
          )}

          <p className="text-[9px] text-on-surface-variant/60 text-center">
            Powered by Freepik
          </p>
        </>
      )}
    </div>
  );
}
