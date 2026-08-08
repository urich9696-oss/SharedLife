import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from '@/components/ui/BottomSheet'
import {
  CONTENT_DRAG_ARM_DISTANCE_PX,
  SHEET_CLOSE_DISTANCE_PX,
} from '@/components/ui/bottom-sheet-gesture'

function pointerSeq(
  target: Element,
  steps: Array<{ type: 'down' | 'move' | 'up'; y: number; x?: number }>,
) {
  const x = 120
  for (const step of steps) {
    const eventType =
      step.type === 'down'
        ? 'pointerdown'
        : step.type === 'move'
          ? 'pointermove'
          : 'pointerup'
    fireEvent(
      target,
      new PointerEvent(eventType, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch',
        clientX: step.x ?? x,
        clientY: step.y,
        button: 0,
      }),
    )
  }
}

describe('BottomSheet (V7)', () => {
  it('schließt über Backdrop und Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <BottomSheet open onClose={onClose} title="Menü">
        <p>Inhalt</p>
      </BottomSheet>,
    )

    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Schliessen' }))
    expect(onClose).toHaveBeenCalled()

    onClose.mockClear()
    rerender(
      <BottomSheet open onClose={onClose} title="Menü">
        <div style={{ height: 800 }}>Langer Inhalt</div>
      </BottomSheet>,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('schließt per Griff-Drag über Distanz-Schwellwert', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>Inhalt</p>
      </BottomSheet>,
    )
    const handle = screen.getByTestId('bottom-sheet-handle')
    // setPointerCapture fehlt oft in jsdom — abfangen
    handle.setPointerCapture = () => {}
    pointerSeq(handle, [
      { type: 'down', y: 40 },
      { type: 'move', y: 40 + SHEET_CLOSE_DISTANCE_PX + 20 },
      { type: 'up', y: 40 + SHEET_CLOSE_DISTANCE_PX + 20 },
    ])
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 1500 })
  })

  it('federt unter dem Schwellwert zurück und bleibt geöffnet', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>Inhalt</p>
      </BottomSheet>,
    )
    const handle = screen.getByTestId('bottom-sheet-handle')
    handle.setPointerCapture = () => {}
    pointerSeq(handle, [
      { type: 'down', y: 40 },
      { type: 'move', y: 40 + 40 },
      { type: 'up', y: 40 + 40 },
    ])
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument()
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute('data-enter-anim', 'off')
  })

  it('übernimmt Content-Drag erst nach Abwärtsbewegung; Aufwärts startet keinen Drag', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <div style={{ height: 1200 }} data-testid="tall">
          Scrollbarer Inhalt
          <button type="button">Oben</button>
        </div>
      </BottomSheet>,
    )
    const scroll = screen.getByTestId('bottom-sheet-scroll')
    Object.defineProperty(scroll, 'scrollTop', { value: 0, writable: true, configurable: true })
    scroll.setPointerCapture = () => {}

    pointerSeq(scroll, [
      { type: 'down', y: 200 },
      { type: 'move', y: 200 - 30 },
      { type: 'up', y: 200 - 30 },
    ])
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute('data-dragging', 'false')

    pointerSeq(scroll, [
      { type: 'down', y: 200 },
      { type: 'move', y: 200 + CONTENT_DRAG_ARM_DISTANCE_PX - 1 },
      { type: 'up', y: 200 + CONTENT_DRAG_ARM_DISTANCE_PX - 1 },
    ])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('schließt per Content-Drag nach Abwärtsübernahme über Schwellwert', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <div style={{ height: 1200 }}>Sehr langer Inhalt</div>
      </BottomSheet>,
    )
    const scroll = screen.getByTestId('bottom-sheet-scroll')
    Object.defineProperty(scroll, 'scrollTop', { value: 0, configurable: true })
    scroll.setPointerCapture = () => {}

    pointerSeq(scroll, [
      { type: 'down', y: 180 },
      { type: 'move', y: 180 + CONTENT_DRAG_ARM_DISTANCE_PX },
      { type: 'move', y: 180 + SHEET_CLOSE_DISTANCE_PX + 30 },
      { type: 'up', y: 180 + SHEET_CLOSE_DISTANCE_PX + 30 },
    ])
    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: 1500 })
  })

  it('startet keinen Content-Drag auf Input/Button am oberen Rand', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} title="Neu">
        <label>
          Titel
          <input data-testid="top-input" />
        </label>
        <button type="button" data-testid="top-button">
          Aktion
        </button>
      </BottomSheet>,
    )

    const input = screen.getByTestId('top-input')
    await user.click(input)
    await user.type(input, 'Hallo')
    expect(input).toHaveValue('Hallo')

    pointerSeq(input, [
      { type: 'down', y: 120 },
      { type: 'move', y: 120 + SHEET_CLOSE_DISTANCE_PX + 40 },
      { type: 'up', y: 120 + SHEET_CLOSE_DISTANCE_PX + 40 },
    ])
    expect(onClose).not.toHaveBeenCalled()

    const button = screen.getByTestId('top-button')
    pointerSeq(button, [
      { type: 'down', y: 160 },
      { type: 'move', y: 160 + SHEET_CLOSE_DISTANCE_PX + 40 },
      { type: 'up', y: 160 + SHEET_CLOSE_DISTANCE_PX + 40 },
    ])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('startet keinen Content-Drag wenn der Scrollbereich nicht oben ist', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <div style={{ height: 1600 }}>Inhalt</div>
      </BottomSheet>,
    )
    const scroll = screen.getByTestId('bottom-sheet-scroll')
    Object.defineProperty(scroll, 'scrollTop', { value: 40, configurable: true })
    scroll.setPointerCapture = () => {}

    pointerSeq(scroll, [
      { type: 'down', y: 200 },
      { type: 'move', y: 200 + SHEET_CLOSE_DISTANCE_PX + 40 },
      { type: 'up', y: 200 + SHEET_CLOSE_DISTANCE_PX + 40 },
    ])
    expect(onClose).not.toHaveBeenCalled()
  })
})
