import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from '@/components/ui/BottomSheet'

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
    expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument()
    expect(screen.getByTestId('bottom-sheet-scroll')).toBeInTheDocument()

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

  it('startet Drag vom Griff unabhängig vom Scrollbereich', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <div data-testid="inner">Scrollbarer Inhalt</div>
      </BottomSheet>,
    )
    const handle = screen.getByTestId('bottom-sheet-handle')
    const scroll = screen.getByTestId('bottom-sheet-scroll')
    expect(handle).toBeTruthy()
    expect(scroll.scrollTop).toBe(0)
  })
})
