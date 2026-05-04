import { useEffect, useState, useMemo } from "react";
import type { Canvas as FabricCanvas } from "fabric";

/**
 * Real-time print-readiness validator.
 *
 * Sits above the canvas. Gives the seller a continuous signal about
 * whether the design they're building will actually print well — DPI,
 * scale, presence of content. Watches Fabric canvas events so the bar
 * updates live as the user resizes, moves, adds, or removes objects.
 *
 * The math:
 *   For each user image, effective print DPI =
 *     (displayPrintArea.scale × dpi) / image.scaleX
 *   This collapses out the canvas/print pixel ratio: if the image is
 *   sized so that its display width on the canvas matches its native
 *   pixel count when projected onto the real print area, you get full
 *   print DPI back. If the user has scaled it up 2x past native, the
 *   effective DPI halves.
 *
 *   Worst-case (smallest) effective DPI across all user images is what
 *   we report — printers will reject the entire file based on its
 *   weakest pixel.
 */

interface DisplayPrintArea {
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
  scale: number;
}

interface Props {
  canvas: FabricCanvas | null;
  revision: number;
  displayPrintArea: DisplayPrintArea;
}

type CheckLevel = "pass" | "warn" | "fail";

interface Check {
  id: string;
  level: CheckLevel;
  label: string;
  detail: string;
  fix?: string;
}

interface ImageStat {
  effectiveDpi: number;
  naturalWidth: number;
  scaleX: number;
}

function computeChecks(
  canvas: FabricCanvas | null,
  pa: DisplayPrintArea,
): Check[] {
  if (!canvas) return [];

  const userObjs = (canvas.getObjects() as any[]).filter(
    (o) => o.name !== "__blank" && o.name !== "__printArea",
  );

  if (userObjs.length === 0) {
    return [
      {
        id: "empty",
        level: "warn",
        label: "Empty print area",
        detail: "Drop a design or text into the print area to see print-readiness checks.",
      },
    ];
  }

  // Collect per-image DPI stats
  const imageStats: ImageStat[] = userObjs
    .filter((o) => o.type === "image")
    .map((o) => {
      const scaleX = o.scaleX || 1;
      const baseDpi = (pa.scale * pa.dpi) / scaleX;
      // Account for Fabric's `width` not always equaling natural pixel
      // count: if the user uploaded a 4000px image but Fabric reports
      // width=2000 (some loaders downsample), the effective DPI we
      // compute would be off. Pull naturalWidth from the underlying
      // <img> when present.
      const elem = (o as any)._element || (o as any).getElement?.();
      const naturalWidth = elem?.naturalWidth || o.width || 1;
      const widthRatio = naturalWidth / (o.width || 1);
      const effectiveDpi = baseDpi * widthRatio;
      return { effectiveDpi, naturalWidth, scaleX };
    });

  const checks: Check[] = [];

  if (imageStats.length > 0) {
    const minDpi = Math.round(Math.min(...imageStats.map((s) => s.effectiveDpi)));
    if (minDpi >= 150) {
      checks.push({
        id: "dpi",
        level: "pass",
        label: `${minDpi} DPI`,
        detail: "Resolution is print-ready.",
      });
    } else if (minDpi >= 100) {
      checks.push({
        id: "dpi",
        level: "warn",
        label: `${minDpi} DPI (low)`,
        detail: `Print quality borderline. Aim for ≥150 DPI on apparel, ≥250 on posters.`,
        fix: "Replace with a higher-resolution source image, or scale this image down.",
      });
    } else {
      checks.push({
        id: "dpi",
        level: "fail",
        label: `${minDpi} DPI (too low)`,
        detail: `Will print pixelated. Threshold for acceptable POD print is ~150 DPI.`,
        fix: "Upload a larger image, or scale this one down. Native pixels available decide max print size.",
      });
    }
  }

  // Coverage check: warn if user images are way smaller than the print
  // area — likely intentional but worth surfacing once. Skip for text.
  const imageObjs = userObjs.filter((o) => o.type === "image");
  if (imageObjs.length > 0) {
    const totalWidth = imageObjs.reduce(
      (acc, o) => Math.max(acc, (o.width || 0) * (o.scaleX || 1)),
      0,
    );
    const coverage = totalWidth / pa.displayWidth;
    if (coverage < 0.25 && coverage > 0) {
      checks.push({
        id: "coverage",
        level: "warn",
        label: `${Math.round(coverage * 100)}% width`,
        detail: "Design uses less than a quarter of the print area width — make sure that's intentional.",
      });
    }
  }

  return checks;
}

const LEVEL_COLOR: Record<CheckLevel, string> = {
  pass: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
  warn: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  fail: "bg-red-500/15 text-red-400 border-red-400/30",
};
const LEVEL_ICON: Record<CheckLevel, string> = {
  pass: "check_circle",
  warn: "warning",
  fail: "error",
};

export function PrintReadinessBar({ canvas, revision, displayPrintArea }: Props) {
  const [tick, setTick] = useState(0);
  const [openCheckId, setOpenCheckId] = useState<string | null>(null);

  // Recompute on canvas mutation events. revision tick from useHistory
  // triggers an additional recompute on undo/redo.
  useEffect(() => {
    if (!canvas) return;
    const bump = () => setTick((t) => t + 1);
    canvas.on("object:added", bump);
    canvas.on("object:removed", bump);
    canvas.on("object:modified", bump);
    canvas.on("object:scaling", bump);
    canvas.on("object:moving", bump);
    return () => {
      canvas.off("object:added", bump);
      canvas.off("object:removed", bump);
      canvas.off("object:modified", bump);
      canvas.off("object:scaling", bump);
      canvas.off("object:moving", bump);
    };
  }, [canvas]);

  const checks = useMemo(
    () => computeChecks(canvas, displayPrintArea),
    // tick + revision force recompute on canvas events / history changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvas, displayPrintArea, tick, revision],
  );

  if (checks.length === 0) return null;

  const openCheck = checks.find((c) => c.id === openCheckId);

  return (
    <div className="bg-surface-container-low rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap text-xs">
      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
        Print
      </span>
      {checks.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setOpenCheckId(openCheckId === c.id ? null : c.id)}
          className={`px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${LEVEL_COLOR[c.level]}`}
          title={c.detail}
        >
          <span className="material-symbols-outlined text-sm">{LEVEL_ICON[c.level]}</span>
          {c.label}
        </button>
      ))}

      {openCheck && (
        <div className="basis-full mt-1 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-[11px] text-on-surface-variant">
          <p className="font-bold text-on-surface mb-1">{openCheck.label}</p>
          <p>{openCheck.detail}</p>
          {openCheck.fix && (
            <p className="mt-1 text-primary">→ {openCheck.fix}</p>
          )}
        </div>
      )}
    </div>
  );
}
