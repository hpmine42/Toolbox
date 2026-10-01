import { describe, expect, it } from 'vitest'
import { randomIntInclusive, validateRandomRange } from './randomInt'

describe('validateRandomRange', () => {
  it('accepts an inclusive integer range', () => {
    expect(validateRandomRange('1', '10')).toEqual({ ok: true, min: 1, max: 10 })
    expect(validateRandomRange('-2', '-2')).toEqual({ ok: true, min: -2, max: -2 })
  })

  it('rejects empty, invalid, reversed, and unsafe ranges', () => {
    expect(validateRandomRange('', '4')).toEqual({ ok: false, error: 'required' })
    expect(validateRandomRange('1.5', '3')).toEqual({ ok: false, error: 'invalid' })
    expect(validateRandomRange('8', '2')).toEqual({ ok: false, error: 'range' })
    expect(validateRandomRange(String(-Number.MAX_SAFE_INTEGER), String(Number.MAX_SAFE_INTEGER))).toEqual({
      ok: false,
      error: 'unsafe',
    })
  })
})

describe('randomIntInclusive', () => {
  it('returns the only possible value without drawing randomness', () => {
    expect(randomIntInclusive(4, 4, () => 0)).toBe(4)
  })

  it('maps the random source onto the inclusive range', () => {
    expect(randomIntInclusive(10, 12, () => 0)).toBe(10)
    expect(randomIntInclusive(10, 12, () => 2)).toBe(12)
  })

  it('rejects biased samples above the limit', () => {
    const span = 3
    const limit = Math.floor(2 ** 53 / span) * span
    const draws = [limit, limit + 5, 1]
    expect(randomIntInclusive(0, 2, () => draws.shift() ?? 0)).toBe(1)
  })
})
