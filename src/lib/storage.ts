export const THEME_STORAGE_KEY = 'toolbox.theme'
export const LANGUAGE_STORAGE_KEY = 'toolbox.language'

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in private mode. The session still works.
  }
}
