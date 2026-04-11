"use client";

import { useCallback } from "react";

export type PanelTab = "elements" | "text" | "upload" | "ai" | "layers";

interface IconToolbarProps {
  activeTab: PanelTab | null;
  onTabChange: (tab: PanelTab | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const TABS: { id: PanelTab; icon: string; label: string }[] = [
  { id: "elements", icon: "dashboard", label: "Elements" },
  { id: "text", icon: "text_fields", label: "Text" },
  { id: "upload", icon: "cloud_upload", label: "Upload" },
  { id: "ai", icon: "auto_awesome", label: "AI Tools" },
  { id: "layers", icon: "layers", label: "Layers" },
];

export function IconToolbar({
  activeTab,
  onTabChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: IconToolbarProps) {
  const handleClick = useCallback(
    (tab: PanelTab) => {
      onTabChange(activeTab === tab ? null : tab);
    },
    [activeTab, onTabChange],
  );

  return (
    <div className="w-14 flex-shrink-0 bg-surface-container-low rounded-2xl flex flex-col items-center py-2 gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab.id)}
          title={tab.label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === tab.id
              ? "bg-primary/20 text-primary"
              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-xl">{tab.icon}</span>
        </button>
      ))}

      <div className="flex-1" />
      <div className="w-8 h-px bg-outline-variant/30 my-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-symbols-outlined text-xl">undo</span>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <span className="material-symbols-outlined text-xl">redo</span>
      </button>
    </div>
  );
}
