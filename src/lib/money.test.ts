import { describe, expect, it } from 'vitest'
import { normalizeMoneyInput, parseMoneyAmount } from '@/lib/money'

describe('normalizeMoneyInput', () => {
  it('accepts plain decimals', () => {
    expect(normalizeMoneyInput('3500')).toBe('3500.00')
    expect(normalizeMoneyInput('12.5')).toBe('12.50')
  })

  it('accepts Swiss formats', () => {
    expect(normalizeMoneyInput("1'200.50")).toBe('1200.50')
    expect(normalizeMoneyInput('1200,5')).toBe('1200.50')
    expect(normalizeMoneyInput('1.200,50')).toBe('1200.50')
  })

  it('rejects invalid values', () => {
    expect(normalizeMoneyInput('')).toBeNull()
    expect(normalizeMoneyInput('abc')).toBeNull()
    expect(normalizeMoneyInput('12.345')).toBeNull()
  })
})

describe('parseMoneyAmount', () => {
  it('parses numbers and strings', () => {
    expect(parseMoneyAmount(42)).toBe(42)
    expect(parseMoneyAmount('19.90')).toBe(19.9)
    expect(parseMoneyAmount("1'000")).toBe(1000)
    expect(parseMoneyAmount(null)).toBe(0)
  })
})
