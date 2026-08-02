import { describe, expect, it } from 'vitest'
import { localPayloadToDetailColumns } from '@/features/sync/detail-sync-map'
import { detailRowToLocalPayload } from '@/features/sync/pull-space'

describe('localPayloadToDetailColumns task assignee', () => {
  it('sendet keine Pair-Rollen als UUID nach Supabase', () => {
    const cols = localPayloadToDetailColumns('task', {
      priority: 'high',
      assigneeId: '',
      assigneeRole: 'dennis',
      dueDate: '2026-08-10',
    })
    expect(cols.assignee_id).toBeNull()
    expect(cols.priority).toBe('high')
    expect(cols.due_date).toBe('2026-08-10')
  })

  it('akzeptiert echte Benutzer-UUIDs', () => {
    const cols = localPayloadToDetailColumns('task', {
      priority: 'medium',
      assigneeId: '11111111-1111-4111-8111-111111111111',
      dueDate: '',
    })
    expect(cols.assignee_id).toBe('11111111-1111-4111-8111-111111111111')
    expect(cols.priority).toBe('normal')
  })
})

describe('date detail sync mapping (V6)', () => {
  it('pusht estimated_cost und reservation_reference', () => {
    const cols = localPayloadToDetailColumns('date', {
      venueName: 'Rooftop',
      estimatedCost: '85.50',
      reservationReference: 'RES-12',
      reservationStatus: 'confirmed',
      surprise: false,
    })
    expect(cols.venue_name).toBe('Rooftop')
    expect(cols.estimated_cost).toBe(85.5)
    expect(cols.reservation_reference).toBe('RES-12')
  })

  it('pullt Date-Details zurück ins UI-Payload', () => {
    const payload = detailRowToLocalPayload('date', {
      venue_name: 'Café',
      estimated_cost: 40,
      reservation_reference: 'A1',
      occasion: 'anniversary',
      surprise: true,
    })
    expect(payload.venueName).toBe('Café')
    expect(payload.estimatedCost).toBe('40')
    expect(payload.reservationReference).toBe('A1')
    expect(payload.surprise).toBe(true)
  })
})

describe('wish detail sync mapping (V6)', () => {
  it('normalisiert Preis und URL', () => {
    const cols = localPayloadToDetailColumns('wish', {
      url: 'https://shop.example/wish',
      price: '1\'299.90',
      priority: 'medium',
      wishStatus: 'open',
    })
    expect(cols.url).toBe('https://shop.example/wish')
    expect(cols.price).toBe(1299.9)
    expect(cols.priority).toBe('normal')
  })
})
