import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY } from './storage'

describe('pre-paint preferences', () => {
  it('uses the same storage keys as the application', () => {
    const html = readFileSync(path.resolve('index.html'), 'utf8')
    expect(html).toContain(THEME_STORAGE_KEY)
    expect(html).toContain(LANGUAGE_STORAGE_KEY)
  })
})
