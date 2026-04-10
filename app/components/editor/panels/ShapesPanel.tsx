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

export function ShapesPanel({ onAddImage, apiBaseUrl }: ShapesPanelProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ClipartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    async (q: string, p: number) => {
      if (!q.trim()) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBaseUrl}/clipart/search?q=${encodeURIComponent(q)}&page=${p}&limit=24`,
          { headers: { "Content-Type": "application/json" } },
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (p === 1) {
          setItems(data.items || []);
        } else {
          setItems((prev) => [...prev, ...(data.items || [])]);
        }
        setHasMore(data.hasMore || false);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl],
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setItems([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setPage(1);
      search(query, 1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Load default icons on mount
  useEffect(() => {
    search("icon", 1);
  }, [search]);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        Clipart
      </h3>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Freepik..."
          className="w-full bg-surface-container pl-8 pr-3 py-2 rounded-lg text-xs border-0 focus:ring-1 focus:ring-primary"
        />
      </div>

      {loading && items.length === 0 && (
        <p className="text-xs text-on-surface-variant text-center py-4">
          Searching...
        </p>
      )}

      <div className="grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto">
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
              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => {
            const next = page + 1;
            setPage(next);
            search(query, next);
          }}
          disabled={loading}
          className="w-full text-xs text-primary hover:underline py-1 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}

      {!loading && items.length === 0 && query.trim() && (
        <p className="text-xs text-on-surface-variant text-center py-4">
          No results for "{query}"
        </p>
      )}

      <p className="text-[9px] text-on-surface-variant/60 text-center">
        Powered by Freepik
      </p>
    </div>
  );
}
