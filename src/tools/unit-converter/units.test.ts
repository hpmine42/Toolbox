import { describe, expect, it } from 'vitest'
import { convertInput, convertTemperature, isBelowAbsoluteZero } from './units'

describe('unit conversion', () => {
  it('converts length and weight through base units', () => {
    expect(convertInput('length', '1', 'km', 'm')).toEqual({ status: 'ok', value: 1000 })
    expect(convertInput('length', '1', 'in', 'cm')).toEqual({ status: 'ok', value: 2.54 })
    expect(convertInput('weight', '1', 'lb', 'g')).toEqual({ status: 'ok', value: 453.59237 })
    expect(convertInput('weight', '2', 'kg', 'g')).toEqual({ status: 'ok', value: 2000 })
  })

  it('converts temperature and rejects absolute zero violations', () => {
    expect(convertTemperature(0, 'c', 'f')).toBe(32)
    expect(convertTemperature(-40, 'c', 'f')).toBe(-40)
    expect(convertTemperature(0, 'c', 'k')).toBe(273.15)
    expect(isBelowAbsoluteZero(-1, 'k')).toBe(true)
    expect(convertInput('temperature', '-1', 'k', 'c')).toEqual({ status: 'error', error: 'absoluteZero' })
    expect(convertInput('temperature', '0', 'k', 'c')).toEqual({ status: 'ok', value: -273.15 })
  })

  it('handles empty and invalid input without throwing', () => {
    expect(convertInput('length', '', 'm', 'km')).toEqual({ status: 'empty' })
    expect(convertInput('length', 'abc', 'm', 'km')).toEqual({ status: 'error', error: 'invalid' })
    expect(convertInput('weight', '1,5', 'kg', 'g')).toEqual({ status: 'ok', value: 1500 })
  })
})
