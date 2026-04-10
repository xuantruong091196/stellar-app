import type { DisplayPrintArea } from "../hooks/useFabricCanvas";

/**
 * Compute the display print area from provider product print area data
 * and the editor canvas dimensions.
 */
export function computeDisplayPrintArea(
  printArea: { name: string; widthPx: number; heightPx: number; dpi: number },
  canvasWidth: number,
  canvasHeight: number,
): DisplayPrintArea {
  const maxWidth = canvasWidth * 0.6;
  const maxHeight = canvasHeight * 0.7;
  const aspect = printArea.widthPx / printArea.heightPx;
  let dw = maxWidth;
  let dh = dw / aspect;
  if (dh > maxHeight) {
    dh = maxHeight;
    dw = dh * aspect;
  }
  return {
    ...printArea,
    displayWidth: Math.round(dw),
    displayHeight: Math.round(dh),
    x: Math.round((canvasWidth - dw) / 2),
    y: Math.round((canvasHeight - dh) / 2),
    scale: printArea.widthPx / dw,
  };
}
