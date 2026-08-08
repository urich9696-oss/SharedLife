/** Distanz-Schwellwert (px) für Drag-to-dismiss */
export const SHEET_CLOSE_DISTANCE_PX = 120

/** Abwärtsgeschwindigkeit (px/s) für Drag-to-dismiss */
export const SHEET_CLOSE_VELOCITY_Y = 900

/** Ob das Sheet nach einem Drag geschlossen werden soll. */
export function shouldDismissSheet(offsetY: number, velocityY: number): boolean {
  return offsetY >= SHEET_CLOSE_DISTANCE_PX || velocityY >= SHEET_CLOSE_VELOCITY_Y
}

/** Aufwärts-Offsets werden auf 0 geklemmt — Sheet nicht über die Ruhelage ziehen. */
export function clampSheetDragY(y: number): number {
  return Math.max(0, y)
}
