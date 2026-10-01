export function parseInteger(value: string): number | null {
  const trimmed = value.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) return null
  return parsed
}

export function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '')
  if (!trimmed) return null
  if (trimmed.includes(',') && trimmed.includes('.')) return null
  const normalized = trimmed.replace(',', '.')
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
