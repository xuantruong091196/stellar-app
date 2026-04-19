import type { Canvas as FabricCanvas } from "fabric";
import type { DisplayPrintArea } from "../hooks/useFabricCanvas";

const MAX_EXPORT_PIXELS = 200_000_000; // ~14142x14142, well under 268M browser limit

/**
 * Export the canvas content within the print area at full print resolution.
 * Returns a base64 PNG data URL. Used for print-production files.
 */
export function exportAtPrintDPI(
  canvas: FabricCanvas,
  printArea: DisplayPrintArea,
): string {
  const multiplier = printArea.scale;
  const exportWidth = printArea.displayWidth * multiplier;
  const exportHeight = printArea.displayHeight * multiplier;

  // Safety check for browser canvas limits
  let finalMultiplier = multiplier;
  if (exportWidth * exportHeight > MAX_EXPORT_PIXELS) {
    const safeScale = Math.sqrt(
      MAX_EXPORT_PIXELS / (printArea.displayWidth * printArea.displayHeight),
    );
    finalMultiplier = safeScale;
    console.warn(
      `Print area too large for full DPI export. Using ${Math.round(
        (safeScale / multiplier) * printArea.dpi,
      )} DPI instead of ${printArea.dpi} DPI.`,
    );
  }

  return canvas.toDataURL({
    format: "png",
    quality: 1.0,
    multiplier: finalMultiplier,
    left: printArea.x,
    top: printArea.y,
    width: printArea.displayWidth,
    height: printArea.displayHeight,
  });
}

/**
 * Export the FULL canvas (blank product + design overlaid) as a JPEG.
 * Used for Shopify product listing images — WYSIWYG, what the merchant
 * sees in the editor is what appears on the storefront.
 */
export function exportFullCanvas(canvas: FabricCanvas): string {
  return canvas.toDataURL({
    format: "jpeg",
    quality: 0.92,
    multiplier: 2,
  });
}
