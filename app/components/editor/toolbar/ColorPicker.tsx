"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const POD_PALETTE = [
  "#FFFFFF", "#000000", "#1E3A5F", "#DC2626",
  "#2563EB", "#166534", "#7F1D1D", "#D97706",
  "#EA580C", "#0D9488", "#7C3AED", "#EC4899",
  "#6B7280", "#78350F", "#4D7C0F", "#F87171",
];

const RECENT_KEY = "stelo-recent-colors";

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentColor(color: string) {
  const recent = getRecentColors().filter((c) => c !== color);
  recent.unshift(color);
  const trimmed = recent.slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  return trimmed;
}

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [hexInput, setHexInput] = useState(color);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentColors(getRecentColors());
  }, []);

  useEffect(() => {
    setHexInput(color);
  }, [color]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleColorSelect = useCallback(
    (c: string) => {
      onChange(c);
      setHexInput(c);
      setRecentColors(saveRecentColor(c));
    },
    [onChange],
  );

  const handleHexSubmit = useCallback(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
      handleColorSelect(hexInput);
    }
  }, [hexInput, handleColorSelect]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-7 h-7 rounded-md border border-outline-variant/30 cursor-pointer flex items-center justify-center"
        title="Pick color"
      >
        <div
          className="w-5 h-5 rounded"
          style={{ backgroundColor: color }}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-surface-container-low rounded-xl border border-outline-variant/20 shadow-xl p-3 w-52">
          {recentColors.length > 0 && (
            <div className="mb-2">
              <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-wider mb-1">
                Recent
              </p>
              <div className="flex gap-1">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorSelect(c)}
                    className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mb-2">
            <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-wider mb-1">
              Print Palette
            </p>
            <div className="grid grid-cols-8 gap-1">
              {POD_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorSelect(c)}
                  className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${
                    c === "#FFFFFF" ? "border-white/30" : "border-white/10"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-wider mb-1">
              Custom
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={handleHexSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
                className="flex-1 bg-surface-container px-2 py-1 rounded text-xs font-mono border-0 focus:ring-1 focus:ring-primary"
                placeholder="#FF5733"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
