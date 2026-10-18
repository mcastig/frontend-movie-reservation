import { config } from '../config'

// Money is integer cents; the API has no currency field, so it's set once in config.
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: config.currency })

export function formatMoney(cents: number): string {
  return money.format(cents / 100)
}
