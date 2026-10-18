import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

describe('formatMoney', () => {
  it('formats integer cents in the configured currency', () => {
    expect(formatMoney(1200)).toBe('$12.00')
    expect(formatMoney(5)).toBe('$0.05')
    expect(formatMoney(123456)).toBe('$1,234.56')
  })
})
