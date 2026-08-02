import { describe, expect, it } from 'vitest'
import { metadataFromDetail } from '@/features/entities/detail-metadata'
import { defaultDateDetail } from '@/features/dates/DateForm'

describe('metadataFromDetail date (V6)', () => {
  it('spiegelt venueName nach metadata.place und belongsToEntityId', () => {
    const meta = metadataFromDetail('date', {
      ...defaultDateDetail,
      venueName: 'Seebar',
      belongsToEntityId: 'trip-1',
      reservationStatus: 'requested',
    })
    expect(meta.place).toBe('Seebar')
    expect(meta.belongsToEntityId).toBe('trip-1')
    expect(meta.reservationStatus).toBe('requested')
  })
})
