import { describe, expect, it } from 'vitest'
import { matchSupportedLanguage, resolveInitialLanguage } from './language'

describe('language resolution', () => {
  it('matches supported language tags and regional variants', () => {
    expect(matchSupportedLanguage('de-DE')).toBe('de')
    expect(matchSupportedLanguage('en-US')).toBe('en')
    expect(matchSupportedLanguage('fr-FR')).toBeNull()
    expect(matchSupportedLanguage(null)).toBeNull()
  })

  it('prefers a stored choice over the browser language', () => {
    expect(resolveInitialLanguage('en', ['de-DE'])).toBe('en')
    expect(resolveInitialLanguage('de', ['en-US'])).toBe('de')
  })

  it('detects the browser language when nothing is stored', () => {
    expect(resolveInitialLanguage(null, ['fr-FR', 'en-GB'])).toBe('en')
    expect(resolveInitialLanguage(null, ['de-AT'])).toBe('de')
  })

  it('falls back to German', () => {
    expect(resolveInitialLanguage(null, ['fr', 'es'])).toBe('de')
    expect(resolveInitialLanguage('nope', [])).toBe('de')
  })
})
