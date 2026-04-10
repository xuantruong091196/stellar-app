import { useState } from "react";
import { useGoogleFonts } from "../hooks/useGoogleFonts";

interface TextPanelProps {
  onAddText: (text: string, fontFamily: string) => void;
}

export function TextPanel({ onAddText }: TextPanelProps) {
  const { fonts, loadFont, loading } = useGoogleFonts();
  const [text, setText] = useState("Your Text");
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [fontSearch, setFontSearch] = useState("");

  const filteredFonts = fontSearch
    ? fonts.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase()))
    : fonts;

  const handleAdd = () => {
    if (!text.trim()) return;
    loadFont(selectedFont);
    onAddText(text, selectedFont);
  };

  const handleSelectFont = async (font: string) => {
    setSelectedFont(font);
    await loadFont(font);
    setShowFontPicker(false);
    setFontSearch("");
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        Add Text
      </h3>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        className="w-full bg-surface-container px-3 py-2 rounded-lg text-sm border-0 focus:ring-1 focus:ring-primary"
      />

      <div className="relative">
        <button
          onClick={() => setShowFontPicker(!showFontPicker)}
          className="w-full bg-surface-container px-3 py-2 rounded-lg text-xs text-left flex items-center justify-between hover:bg-surface-container-high transition-colors"
        >
          <span style={{ fontFamily: selectedFont }}>{selectedFont}</span>
          <span className="material-symbols-outlined text-sm">
            {showFontPicker ? "expand_less" : "expand_more"}
          </span>
        </button>

        {showFontPicker && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface-container-low rounded-lg shadow-xl border border-outline-variant/20 max-h-60 overflow-hidden">
            <div className="p-2 sticky top-0 bg-surface-container-low">
              <input
                type="text"
                value={fontSearch}
                onChange={(e) => setFontSearch(e.target.value)}
                placeholder="Search fonts..."
                className="w-full bg-surface-container px-2 py-1.5 rounded text-xs border-0 focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredFonts.slice(0, 50).map((font) => (
                <button
                  key={font}
                  onClick={() => handleSelectFont(font)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-container transition-colors ${
                    font === selectedFont ? "text-primary font-bold" : ""
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={!text.trim() || loading}
        className="w-full stellar-gradient text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-sm">text_fields</span>
        Add Text
      </button>
    </div>
  );
}
