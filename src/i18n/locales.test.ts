import { describe, expect, it } from 'vitest'
import de from './locales/de.json'
import en from './locales/en.json'

function collectKeys(value: unknown, path: string, keys: string[]): void {
  if (typeof value === 'string') {
    if (value.trim() === '') throw new Error(`Empty translation at ${path}`)
    keys.push(path)
    return
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Unexpected translation value at ${path || 'root'}`)
  }
  for (const [key, nested] of Object.entries(value)) {
    collectKeys(nested, path ? `${path}.${key}` : key, keys)
  }
}

describe('translation files', () => {
  it('keeps German and English keys in parity', () => {
    const german: string[] = []
    const english: string[] = []
    collectKeys(de, '', german)
    collectKeys(en, '', english)
    expect(english).toEqual(german)
  })
})
