import { describe, expect, it } from 'vitest'
import { formatAmount, formatDate, isValidDate } from './format'

describe('formatAmount', () => {
  it.each([
    [250, '250.00'],
    [150.5, '150.50'],
    [0, '0.00'],
    // No thousands separator, as in the screenshot.
    [1234567.891, '1234567.89'],
  ])('should format %s as %s', (amount, expected) => {
    expect(formatAmount(amount)).toBe(expected)
  })
})

// vitest.config.ts runs tests in UTC, so local time equals the UTC value.
describe('formatDate', () => {
  it.each([
    ['2024-04-03T14:05:09Z', '03/04/2024, 14:05:09'],
    ['2024-01-05T00:00:00Z', '05/01/2024, 00:00:00'],
  ])('should format %s as %s', (isoDate, expected) => {
    expect(formatDate(isoDate)).toBe(expected)
  })
})

describe('formatDate with an unparseable value', () => {
  it.each([['not-a-date'], ['']])(
    'should return %j unchanged instead of throwing',
    (raw) => {
      expect(formatDate(raw)).toBe(raw)
    },
  )
})

describe('isValidDate', () => {
  it.each([['2024-04-15T10:00:00Z'], ['2024-04-15T10:00:00.000Z']])(
    'should accept the ISO date %j',
    (value) => {
      expect(isValidDate(value)).toBe(true)
    },
  )

  it.each([
    // Not strings: new Date(null) and new Date(0) are the 1970 epoch, not invalid.
    [null],
    [undefined],
    [0],
    // Not ISO 8601, though new Date() accepts it.
    ['April 15 2024'],
    // Impossible date: new Date() rolls it over to 1 March.
    ['2024-02-30T10:00:00Z'],
    [''],
  ])('should reject %j', (value) => {
    expect(isValidDate(value)).toBe(false)
  })
})
