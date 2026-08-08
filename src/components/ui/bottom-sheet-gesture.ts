/** Distanz-Schwellwert (px) für Drag-to-dismiss */
export const SHEET_CLOSE_DISTANCE_PX = 120

/** Abwärtsgeschwindigkeit (px/s) für Drag-to-dismiss */
export const SHEET_CLOSE_VELOCITY_Y = 900

/** Ab dieser Abwärtsbewegung wird Content-Drag übernommen (scrollTop === 0). */
export const CONTENT_DRAG_ARM_DISTANCE_PX = 12

/** Ob das Sheet nach einem Drag geschlossen werden soll. */
export function shouldDismissSheet(offsetY: number, velocityY: number): boolean {
  return offsetY >= SHEET_CLOSE_DISTANCE_PX || velocityY >= SHEET_CLOSE_VELOCITY_Y
}

/** Aufwärts-Offsets werden auf 0 geklemmt — Sheet nicht über die Ruhelage ziehen. */
export function clampSheetDragY(y: number): number {
  return Math.max(0, y)
}

/** Content-Drag erst nach klarer Abwärtsbewegung und nur am Scroll-Anfang. */
export function shouldArmContentSheetDrag(input: {
  scrollTop: number
  deltaY: number
}): boolean {
  return input.scrollTop <= 0 && input.deltaY >= CONTENT_DRAG_ARM_DISTANCE_PX
}

/** Formular-/Button-Ziele im Sheet — kein Content-Drag übernehmen. */
export function isSheetInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, label, [role="button"], [role="radio"], [role="checkbox"], [contenteditable="true"]',
    ),
  )
}

/** Geschwindigkeit aus zwei Samples (px/s). */
export function pointerVelocityY(
  fromY: number,
  toY: number,
  fromMs: number,
  toMs: number,
): number {
  const dt = Math.max(1, toMs - fromMs)
  return ((toY - fromY) / dt) * 1000
}
