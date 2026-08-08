import { describe, expect, it } from 'vitest'
import {
  SHEET_CLOSE_DISTANCE_PX,
  SHEET_CLOSE_VELOCITY_Y,
  clampSheetDragY,
  shouldDismissSheet,
} from '@/components/ui/bottom-sheet-gesture'

describe('bottom sheet gesture (V7)', () => {
  it('schließt bei ausreichender Drag-Distanz', () => {
    expect(shouldDismissSheet(SHEET_CLOSE_DISTANCE_PX, 0)).toBe(true)
    expect(shouldDismissSheet(SHEET_CLOSE_DISTANCE_PX + 20, 0)).toBe(true)
  })

  it('schließt bei ausreichender Abwärtsgeschwindigkeit', () => {
    expect(shouldDismissSheet(20, SHEET_CLOSE_VELOCITY_Y)).toBe(true)
    expect(shouldDismissSheet(10, SHEET_CLOSE_VELOCITY_Y + 100)).toBe(true)
  })

  it('bleibt unter dem Schwellwert geöffnet (federt zurück)', () => {
    expect(shouldDismissSheet(SHEET_CLOSE_DISTANCE_PX - 1, SHEET_CLOSE_VELOCITY_Y - 1)).toBe(
      false,
    )
    expect(shouldDismissSheet(40, 200)).toBe(false)
  })

  it('klemmt Aufwärts-Offsets auf 0', () => {
    expect(clampSheetDragY(-40)).toBe(0)
    expect(clampSheetDragY(80)).toBe(80)
  })
})
