import { useState, useCallback, useRef } from "react";
import DOMPurify from "dompurify";

interface UploadPanelProps {
  onAddImage: (url: string) => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export function UploadPanel({ onAddImage }: UploadPanelProps) {
  const [recentUploads, setRecentUploads] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("stelo-recent-uploads") || "[]");
    } catch {
      return [];
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Unsupported file type. Use PNG, JPG, or SVG.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File too large. Max 25MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let dataUrl = reader.result as string;

        // Sanitize SVG files to prevent XSS
        if (file.type === "image/svg+xml") {
          try {
            const svgText = atob(dataUrl.split(",")[1]);
            const clean = DOMPurify.sanitize(svgText, {
              USE_PROFILES: { svg: true, svgFilters: true },
              ADD_TAGS: ["use"],
              FORBID_TAGS: ["script", "foreignObject"],
              FORBID_ATTR: ["onload", "onerror", "onclick", "onmouseover"],
            });
            const blob = new Blob([clean], { type: "image/svg+xml" });
            dataUrl = URL.createObjectURL(blob);
          } catch {
            setError("Invalid SVG file.");
            return;
          }
        }

        onAddImage(dataUrl);
        setRecentUploads((prev) => {
          const next = [dataUrl, ...prev].slice(0, 6);
          try {
            sessionStorage.setItem("stelo-recent-uploads", JSON.stringify(next));
          } catch { /* sessionStorage full */ }
          return next;
        });
      };
      reader.readAsDataURL(file);
    },
    [onAddImage, recentUploads],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-outline-variant/30 hover:border-primary/50"
        }`}
      >
        <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2 block">
          cloud_upload
        </span>
        <p className="text-xs text-on-surface-variant">
          Drag & drop image or{" "}
          <span className="text-primary font-bold">click to browse</span>
        </p>
        <p className="text-[10px] text-on-surface-variant/50 mt-1">
          PNG, JPG, SVG — Max 25MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      {recentUploads.length > 0 && (
        <div>
          <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider mb-1.5">
            Recent Uploads
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {recentUploads.map((url, i) => (
              <button
                key={i}
                onClick={() => onAddImage(url)}
                className="aspect-square rounded-lg bg-surface-container-high hover:bg-surface-container-highest p-1 transition-colors"
              >
                <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
