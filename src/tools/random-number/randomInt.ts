import { parseInteger } from '../../lib/parseNumber'

const TWO_53 = 2 ** 53

export type RandomRangeError = 'required' | 'invalid' | 'range' | 'unsafe'

export type RandomRangeResult =
  | { ok: true; min: number; max: number }
  | { ok: false; error: RandomRangeError }

export function validateRandomRange(minRaw: string, maxRaw: string): RandomRangeResult {
  if (minRaw.trim() === '' || maxRaw.trim() === '') return { ok: false, error: 'required' }
  const min = parseInteger(minRaw)
  const max = parseInteger(maxRaw)
  if (min === null || max === null) return { ok: false, error: 'invalid' }
  if (min > max) return { ok: false, error: 'range' }
  if (max - min > Number.MAX_SAFE_INTEGER - 1) return { ok: false, error: 'unsafe' }
  return { ok: true, min, max }
}

export function randomUint53(): number {
  const buffer = new Uint32Array(2)
  crypto.getRandomValues(buffer)
  const high = buffer[0] ?? 0
  const low = buffer[1] ?? 0
  return (high & 0x1fffff) * 0x100000000 + low
}

export function randomIntInclusive(
  min: number,
  max: number,
  nextUint53: () => number = randomUint53,
): number {
  const span = max - min + 1
  if (span === 1) return min
  const limit = Math.floor(TWO_53 / span) * span
  let sample = nextUint53()
  while (sample >= limit) sample = nextUint53()
  return min + (sample % span)
}
