import { readStorage, THEME_STORAGE_KEY, writeStorage } from '../lib/storage'

export const themePreferences = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof themePreferences)[number]
export type ResolvedTheme = 'light' | 'dark'

export function parseThemePreference(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function readThemePreference(): ThemePreference {
  return parseThemePreference(readStorage(THEME_STORAGE_KEY))
}

export function persistThemePreference(preference: ThemePreference): void {
  writeStorage(THEME_STORAGE_KEY, preference)
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  const themeColor = theme === 'dark' ? '#12110f' : '#f3f0e8'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
}
