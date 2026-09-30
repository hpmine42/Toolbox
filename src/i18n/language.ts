import { LANGUAGE_STORAGE_KEY, readStorage, writeStorage } from '../lib/storage'

export const supportedLanguages = [
  { code: 'de', labelKey: 'languages.de' },
  { code: 'en', labelKey: 'languages.en' },
] as const

export type AppLanguage = (typeof supportedLanguages)[number]['code']

export const defaultLanguage: AppLanguage = 'de'

export function matchSupportedLanguage(tag: string | null | undefined): AppLanguage | null {
  if (!tag) return null
  const base = tag.toLowerCase().split('-')[0]
  const match = supportedLanguages.find((language) => language.code === base)
  return match?.code ?? null
}

export function resolveInitialLanguage(
  stored: string | null = readStorage(LANGUAGE_STORAGE_KEY),
  browserTags: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): AppLanguage {
  const storedMatch = matchSupportedLanguage(stored)
  if (storedMatch) return storedMatch
  for (const tag of browserTags) {
    const match = matchSupportedLanguage(tag)
    if (match) return match
  }
  return defaultLanguage
}

export function persistLanguage(language: AppLanguage): void {
  writeStorage(LANGUAGE_STORAGE_KEY, language)
  document.documentElement.lang = language
}
