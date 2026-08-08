import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { WishFormFields, defaultWishDetail, type WishDetailValues } from '@/features/wishes/WishForm'
import {
  normalizeWishPriority,
  wishPriorityLabel,
} from '@/features/wishes/wish-priority'
import { localPayloadToDetailColumns } from '@/features/sync/detail-sync-map'

function WishFormHarness({
  initial = defaultWishDetail,
  onChange,
}: {
  initial?: WishDetailValues
  onChange?: (v: WishDetailValues) => void
}) {
  const methods = useForm({ defaultValues: { description: '' } })
  return (
    <FormProvider {...methods}>
      <WishFormFields
        values={initial}
        onChange={(next) => {
          onChange?.(next)
        }}
      />
    </FormProvider>
  )
}

describe('wish priority (V7)', () => {
  it('normalisiert medium → normal und liest alle kanonischen Werte', () => {
    expect(normalizeWishPriority('medium')).toBe('normal')
    expect(normalizeWishPriority('low')).toBe('low')
    expect(normalizeWishPriority('normal')).toBe('normal')
    expect(normalizeWishPriority('high')).toBe('high')
    expect(normalizeWishPriority('dream')).toBe('dream')
  })

  it('zeigt Nutzerlabels inkl. Herzenswunsch', () => {
    expect(wishPriorityLabel('low')).toBe('Niedrig')
    expect(wishPriorityLabel('normal')).toBe('Normal')
    expect(wishPriorityLabel('high')).toBe('Hoch')
    expect(wishPriorityLabel('dream')).toBe('Herzenswunsch')
    expect(wishPriorityLabel('medium')).toBe('Normal')
  })

  it('übernimmt Priorität im Create-Formular in das Detail-Payload', async () => {
    const user = userEvent.setup()
    let latest = defaultWishDetail
    render(
      <WishFormHarness
        onChange={(v) => {
          latest = v
        }}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Herzenswunsch' }))
    expect(latest.priority).toBe('dream')

    const cols = localPayloadToDetailColumns('wish', { ...latest })
    expect(cols.priority).toBe('dream')
  })

  it('übernimmt Priorität bei Edit und mappt high/low/normal', async () => {
    const user = userEvent.setup()
    let latest: WishDetailValues = { ...defaultWishDetail, priority: 'high' }
    const { rerender } = render(
      <WishFormHarness
        initial={latest}
        onChange={(v) => {
          latest = v
        }}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Hoch' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: 'Niedrig' }))
    expect(latest.priority).toBe('low')

    rerender(
      <WishFormHarness
        initial={latest}
        onChange={(v) => {
          latest = v
        }}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Niedrig' })).toHaveAttribute('aria-checked', 'true')

    expect(localPayloadToDetailColumns('wish', { priority: 'high' }).priority).toBe('high')
    expect(localPayloadToDetailColumns('wish', { priority: 'normal' }).priority).toBe('normal')
    expect(localPayloadToDetailColumns('wish', { priority: 'medium' }).priority).toBe('normal')
  })
})
