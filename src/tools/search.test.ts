import { describe, expect, it } from 'vitest'
import { matchesQuery, normalizeSearch, toolHaystack } from './search'
import type { ToolDefinition } from './types'

const tool: ToolDefinition = {
  id: 'unit-converter',
  nameKey: 'name',
  descriptionKey: 'description',
  keywordsKey: 'keywords',
  category: 'converters',
  icon: 'ruler',
  route: '/tools/unit-converter',
  status: 'available',
}

describe('search', () => {
  it('ignores case and diacritics', () => {
    expect(normalizeSearch('Länge')).toBe('lange')
    expect(matchesQuery('Einheiten-Umrechner Länge', 'lange')).toBe(true)
    expect(matchesQuery('Timer', 'temp')).toBe(false)
  })

  it('requires every search token to match', () => {
    expect(matchesQuery('unit converter temperature', 'unit temp')).toBe(true)
    expect(matchesQuery('unit converter temperature', 'unit weight')).toBe(false)
    expect(matchesQuery('Timer', '   ')).toBe(true)
  })

  it('includes both languages in the haystack', () => {
    const catalog: Record<string, Record<string, string>> = {
      de: { name: 'Einheiten-Umrechner', description: 'Gewicht', keywords: 'temperatur', 'categories.converters': 'Umrechner' },
      en: { name: 'Unit converter', description: 'Weight', keywords: 'temperature', 'categories.converters': 'Converters' },
    }
    const haystack = toolHaystack(tool, (key, language) => catalog[language]?.[key] ?? '', ['de', 'en'])
    expect(matchesQuery(haystack, 'temperature')).toBe(true)
    expect(matchesQuery(haystack, 'gewicht')).toBe(true)
  })
})
