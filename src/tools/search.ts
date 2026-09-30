import type { ToolDefinition } from './types'

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('de').normalize('NFD').replace(/\p{M}/gu, '')
}

export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const normalized = normalizeSearch(haystack)
  return tokens.every((token) => normalized.includes(token))
}

export function toolHaystack(
  tool: ToolDefinition,
  read: (key: string, language: string) => string,
  languages: readonly string[],
): string {
  const parts = [tool.id, tool.category, tool.route]
  for (const language of languages) {
    parts.push(
      read(tool.nameKey, language),
      read(tool.descriptionKey, language),
      read(tool.keywordsKey, language),
      read(`categories.${tool.category}`, language),
    )
  }
  return parts.filter(Boolean).join(' ')
}
