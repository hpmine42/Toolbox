import { parseDecimal } from '../../lib/parseNumber'

export const unitCategories = ['length', 'weight', 'temperature'] as const
export type UnitCategory = (typeof unitCategories)[number]

export interface LinearUnit {
  id: string
  toBase: number
}

export const lengthUnits: readonly LinearUnit[] = [
  { id: 'mm', toBase: 0.001 },
  { id: 'cm', toBase: 0.01 },
  { id: 'm', toBase: 1 },
  { id: 'km', toBase: 1000 },
  { id: 'in', toBase: 0.0254 },
  { id: 'ft', toBase: 0.3048 },
  { id: 'yd', toBase: 0.9144 },
  { id: 'mi', toBase: 1609.344 },
]

export const weightUnits: readonly LinearUnit[] = [
  { id: 'mg', toBase: 0.001 },
  { id: 'g', toBase: 1 },
  { id: 'kg', toBase: 1000 },
  { id: 't', toBase: 1_000_000 },
  { id: 'oz', toBase: 28.349523125 },
  { id: 'lb', toBase: 453.59237 },
]

export const temperatureUnits = ['c', 'f', 'k'] as const
export type TemperatureUnit = (typeof temperatureUnits)[number]

export const defaultUnitPair: Record<UnitCategory, { from: string; to: string }> = {
  length: { from: 'm', to: 'km' },
  weight: { from: 'kg', to: 'g' },
  temperature: { from: 'c', to: 'f' },
}

export function unitsFor(category: UnitCategory): readonly string[] {
  if (category === 'length') return lengthUnits.map((unit) => unit.id)
  if (category === 'weight') return weightUnits.map((unit) => unit.id)
  return temperatureUnits
}

function clean(value: number): number {
  if (!Number.isFinite(value)) return value
  return Number(value.toPrecision(12))
}

export function convertLinear(value: number, from: LinearUnit, to: LinearUnit): number {
  return clean((value * from.toBase) / to.toBase)
}

export function toCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === 'c') return value
  if (unit === 'f') return ((value - 32) * 5) / 9
  return value - 273.15
}

export function fromCelsius(celsius: number, unit: TemperatureUnit): number {
  if (unit === 'c') return celsius
  if (unit === 'f') return (celsius * 9) / 5 + 32
  return celsius + 273.15
}

export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  return clean(fromCelsius(toCelsius(value, from), to))
}

export function isBelowAbsoluteZero(value: number, unit: TemperatureUnit): boolean {
  return toCelsius(value, unit) + 273.15 < -1e-8
}

export type ConversionResult =
  | { status: 'empty' }
  | { status: 'error'; error: 'invalid' | 'absoluteZero' }
  | { status: 'ok'; value: number }

function findLinear(category: 'length' | 'weight', id: string): LinearUnit | undefined {
  const units = category === 'length' ? lengthUnits : weightUnits
  return units.find((unit) => unit.id === id)
}

export function convertInput(
  category: UnitCategory,
  rawValue: string,
  fromId: string,
  toId: string,
): ConversionResult {
  if (rawValue.trim() === '') return { status: 'empty' }
  const value = parseDecimal(rawValue)
  if (value === null) return { status: 'error', error: 'invalid' }

  if (category === 'temperature') {
    if (!temperatureUnits.includes(fromId as TemperatureUnit) || !temperatureUnits.includes(toId as TemperatureUnit)) {
      return { status: 'error', error: 'invalid' }
    }
    const from = fromId as TemperatureUnit
    const to = toId as TemperatureUnit
    if (isBelowAbsoluteZero(value, from)) return { status: 'error', error: 'absoluteZero' }
    return { status: 'ok', value: convertTemperature(value, from, to) }
  }

  const from = findLinear(category, fromId)
  const to = findLinear(category, toId)
  if (!from || !to) return { status: 'error', error: 'invalid' }
  return { status: 'ok', value: convertLinear(value, from, to) }
}
