import { describe, expect, it } from 'vitest'
import {
  CONTENT_DRAG_ARM_DISTANCE_PX,
  SHEET_CLOSE_DISTANCE_PX,
  SHEET_CLOSE_VELOCITY_Y,
  clampSheetDragY,
  isSheetInteractiveTarget,
  pointerVelocityY,
  shouldArmContentSheetDrag,
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

  it('aktiviert Content-Drag erst nach klarer Abwärtsbewegung bei scrollTop 0', () => {
    expect(
      shouldArmContentSheetDrag({ scrollTop: 0, deltaY: CONTENT_DRAG_ARM_DISTANCE_PX - 1 }),
    ).toBe(false)
    expect(
      shouldArmContentSheetDrag({ scrollTop: 0, deltaY: CONTENT_DRAG_ARM_DISTANCE_PX }),
    ).toBe(true)
    expect(shouldArmContentSheetDrag({ scrollTop: 1, deltaY: 40 })).toBe(false)
    expect(shouldArmContentSheetDrag({ scrollTop: 0, deltaY: -20 })).toBe(false)
  })

  it('erkennt interaktive Ziele im Sheet', () => {
    const input = document.createElement('input')
    const wrap = document.createElement('div')
    wrap.appendChild(input)
    expect(isSheetInteractiveTarget(input)).toBe(true)
    expect(isSheetInteractiveTarget(wrap)).toBe(false)
    expect(isSheetInteractiveTarget(null)).toBe(false)
  })

  it('berechnet Pointer-Geschwindigkeit', () => {
    expect(pointerVelocityY(0, 100, 0, 100)).toBe(1000)
  })
})
