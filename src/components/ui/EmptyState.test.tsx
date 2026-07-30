import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="Noch leer"
        description="Füge den ersten Eintrag hinzu."
      />,
    )
    expect(screen.getByRole('heading', { name: 'Noch leer' })).toBeInTheDocument()
    expect(screen.getByText('Füge den ersten Eintrag hinzu.')).toBeInTheDocument()
  })

  it('calls onAction when action button clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <EmptyState
        title="Leer"
        actionLabel="Erstellen"
        onAction={onAction}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Erstellen' }))
    expect(onAction).toHaveBeenCalledOnce()
  })
})
