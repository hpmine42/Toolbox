import { describe, expect, it } from 'vitest'
import { parseDecimal, parseInteger } from './parseNumber'

describe('parseInteger', () => {
  it('accepts safe integers', () => {
    expect(parseInteger(' 42 ')).toBe(42)
    expect(parseInteger('-3')).toBe(-3)
    expect(parseInteger('+8')).toBe(8)
  })

  it('rejects decimals, empty values, and unsafe integers', () => {
    expect(parseInteger('')).toBeNull()
    expect(parseInteger('1.5')).toBeNull()
    expect(parseInteger('1,5')).toBeNull()
    expect(parseInteger('12abc')).toBeNull()
    expect(parseInteger(String(Number.MAX_SAFE_INTEGER + 2))).toBeNull()
  })
})

describe('parseDecimal', () => {
  it('accepts dot and comma decimals', () => {
    expect(parseDecimal('1.5')).toBe(1.5)
    expect(parseDecimal('1,5')).toBe(1.5)
    expect(parseDecimal('-0,25')).toBe(-0.25)
  })

  it('rejects ambiguous or incomplete input', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('1.000,5')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('.')).toBeNull()
  })
})
