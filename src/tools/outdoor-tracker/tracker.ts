export const OUTDOOR_DATA_KEY = 'outdoorData'
export const TRACKING_START_KEY = 'trackingStart'
export const LEGACY_DARK_MODE_KEY = 'darkMode'
export const NEON_MODE_KEY = 'neonMode'

export interface OutdoorEntry {
  minutes: number | ''
  note: string
}

export type OutdoorData = Record<string, OutdoorEntry>

export interface MonthEntry {
  key: string
  minutes: number | null
  beforeStart?: boolean
}

export interface MonthStats {
  year: number
  month: number
  daysInMonth: number
  entries: MonthEntry[]
  sum: number
  trackedDays: number
  average: number
  averagePerCalendarDay: number
  bestDay: string | null
  bestMinutes: number
  worstDay: string | null
  worstMinutes: number
  longestStreak: number
  longestStreakStart: string | null
  longestStreakEnd: string | null
}

export interface AllTimeStats {
  totalMinutes: number
  recordedDays: number
  bestDay: string | null
  bestDayMinutes: number
  longestStreak: number
  longestStreakEnd: string | null
  currentStreak: number
  bestMonth: { year: number; month: number; average: number } | null
  worstMonth: { year: number; month: number; average: number } | null
  mostMinutesMonth: { year: number; month: number; total: number } | null
  weekdayAverages: Array<{ weekday: number; average: number; count: number }>
}

export interface OutdoorBackup {
  outdoorData: OutdoorData
  darkMode?: string | null
  neonMode?: string | null
  trackingStart?: string | null
}

export interface ParsedBackup {
  outdoorData: OutdoorData
  darkMode?: string | null
  neonMode?: string | null
  trackingStart?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createLocalDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0)
  date.setFullYear(year, monthIndex, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function dateFromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(key)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = createLocalDate(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function dateKeyFromInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = createLocalDate(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function dateInputValue(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeEntry(value: unknown): OutdoorEntry {
  if (typeof value === 'number' && Number.isFinite(value)) return { minutes: value, note: '' }
  if (!isRecord(value)) return { minutes: '', note: '' }

  const rawMinutes = value.minutes
  let minutes: number | '' = ''
  if (typeof rawMinutes === 'number' && Number.isFinite(rawMinutes)) {
    minutes = rawMinutes
  } else if (typeof rawMinutes === 'string' && rawMinutes.trim() !== '') {
    const parsed = Number(rawMinutes)
    if (Number.isFinite(parsed)) minutes = parsed
  }

  return {
    minutes,
    note: typeof value.note === 'string' ? value.note : '',
  }
}

export function normalizeOutdoorData(value: unknown): OutdoorData {
  if (!isRecord(value)) return {}
  const result: OutdoorData = {}
  for (const [key, entry] of Object.entries(value)) {
    const date = dateFromKey(key)
    if (!date) continue
    result[dateKey(date)] = normalizeEntry(entry)
  }
  return result
}

export function parseOutdoorData(raw: string | null): OutdoorData {
  if (!raw) return {}
  try {
    return normalizeOutdoorData(JSON.parse(raw) as unknown)
  } catch {
    return {}
  }
}

export function isBeforeStart(key: string, trackingStart: Date | null): boolean {
  if (!trackingStart) return false
  const date = dateFromKey(key)
  if (!date) return false
  return date.getTime() < createLocalDate(trackingStart.getFullYear(), trackingStart.getMonth(), trackingStart.getDate()).getTime()
}

export function hasMinutes(entry: OutdoorEntry): entry is OutdoorEntry & { minutes: number } {
  return entry.minutes !== '' && Number.isFinite(entry.minutes)
}

function dayOrdinal(date: Date): number {
  const utc = new Date(0)
  utc.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate())
  utc.setUTCHours(0, 0, 0, 0)
  return utc.getTime() / 86_400_000
}

export function getPeriodAverages(
  data: OutdoorData,
  year: number,
  month: number,
  trackingStart: Date | null,
): { month: number | null; year: number | null } {
  let monthTotal = 0
  let monthCount = 0
  let yearTotal = 0
  let yearCount = 0

  for (const [key, rawEntry] of Object.entries(data)) {
    if (isBeforeStart(key, trackingStart)) continue
    const date = dateFromKey(key)
    const entry = normalizeEntry(rawEntry)
    if (!date || !hasMinutes(entry)) continue
    if (date.getFullYear() === year) {
      yearTotal += entry.minutes
      yearCount += 1
      if (date.getMonth() === month) {
        monthTotal += entry.minutes
        monthCount += 1
      }
    }
  }

  return {
    month: monthCount ? Math.round(monthTotal / monthCount) : null,
    year: yearCount ? Math.round(yearTotal / yearCount) : null,
  }
}

export function getMonthStats(year: number, month: number, data: OutdoorData, trackingStart: Date | null): MonthStats {
  const daysInMonth = new Date(year, month, 0).getDate()
  const entries: MonthEntry[] = []
  let sum = 0
  let trackedDays = 0
  let bestDay: string | null = null
  let bestMinutes = 0
  let worstDay: string | null = null
  let worstMinutes = Number.POSITIVE_INFINITY
  let longestStreak = 0
  let currentStreak = 0
  let currentStreakStart: string | null = null
  let longestStreakStart: string | null = null
  let longestStreakEnd: string | null = null

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${month}-${day}`
    if (isBeforeStart(key, trackingStart)) {
      entries.push({ key, minutes: null, beforeStart: true })
      currentStreak = 0
      currentStreakStart = null
      continue
    }

    const entry = normalizeEntry(data[key])
    const minutes = hasMinutes(entry) ? entry.minutes : null
    entries.push({ key, minutes })

    if (minutes !== null && minutes > 0) {
      sum += minutes
      trackedDays += 1
      if (minutes > bestMinutes) {
        bestMinutes = minutes
        bestDay = key
      }
      if (minutes < worstMinutes) {
        worstMinutes = minutes
        worstDay = key
      }
      if (currentStreak === 0) currentStreakStart = key
      currentStreak += 1
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
        longestStreakStart = currentStreakStart
        longestStreakEnd = key
      }
    } else {
      currentStreak = 0
      currentStreakStart = null
    }
  }

  return {
    year,
    month,
    daysInMonth,
    entries,
    sum,
    trackedDays,
    average: trackedDays ? Math.round(sum / trackedDays) : 0,
    averagePerCalendarDay: trackedDays ? Math.round(sum / daysInMonth) : 0,
    bestDay,
    bestMinutes,
    worstDay: trackedDays ? worstDay : null,
    worstMinutes: trackedDays ? worstMinutes : 0,
    longestStreak,
    longestStreakStart,
    longestStreakEnd,
  }
}

export function getAllTimeStats(data: OutdoorData, trackingStart: Date | null, today: Date): AllTimeStats {
  const monthly = new Map<string, { year: number; month: number; total: number; count: number }>()
  const weekdayTotals = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))
  let totalMinutes = 0
  let recordedDays = 0
  let bestDay: string | null = null
  let bestDayMinutes = 0

  const allKeys = Object.keys(data)
    .filter((key) => !isBeforeStart(key, trackingStart) && dateFromKey(key) !== null)
    .sort((a, b) => (dateFromKey(a)?.getTime() ?? 0) - (dateFromKey(b)?.getTime() ?? 0))

  for (const key of allKeys) {
    const date = dateFromKey(key)
    const entry = normalizeEntry(data[key])
    if (!date || !hasMinutes(entry)) continue

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const monthKey = `${year}-${month}`
    const group = monthly.get(monthKey) ?? { year, month, total: 0, count: 0 }
    group.total += entry.minutes
    group.count += 1
    monthly.set(monthKey, group)

    totalMinutes += entry.minutes
    recordedDays += 1
    if (entry.minutes > bestDayMinutes) {
      bestDayMinutes = entry.minutes
      bestDay = key
    }

    const weekday = (date.getDay() + 6) % 7
    const weekdayTotal = weekdayTotals[weekday]
    if (weekdayTotal) {
      weekdayTotal.total += entry.minutes
      weekdayTotal.count += 1
    }
  }

  const monthValues = [...monthly.values()].map((month) => ({
    ...month,
    average: Math.round(month.total / month.count),
  }))
  const bestMonth = monthValues.reduce<typeof monthValues[number] | null>(
    (best, item) => (!best || item.average > best.average ? item : best),
    null,
  )
  const worstMonth = monthValues.reduce<typeof monthValues[number] | null>(
    (worst, item) => (!worst || item.average < worst.average ? item : worst),
    null,
  )
  const mostMinutesMonth = monthValues.reduce<typeof monthValues[number] | null>(
    (best, item) => (!best || item.total > best.total ? item : best),
    null,
  )

  let longestStreak = 0
  let longestStreakEnd: string | null = null
  let streak = 0
  let previousOrdinal: number | null = null
  for (const key of allKeys) {
    const entry = normalizeEntry(data[key])
    const date = dateFromKey(key)
    if (!date || !hasMinutes(entry) || entry.minutes <= 0) continue
    const ordinal = dayOrdinal(date)
    streak = previousOrdinal !== null && ordinal - previousOrdinal === 1 ? streak + 1 : 1
    previousOrdinal = ordinal
    if (streak > longestStreak) {
      longestStreak = streak
      longestStreakEnd = key
    }
  }

  let currentStreak = 0
  const todayDate = createLocalDate(today.getFullYear(), today.getMonth(), today.getDate())
  for (let offset = 0; ; offset += 1) {
    const date = createLocalDate(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - offset)
    const key = dateKey(date)
    if (isBeforeStart(key, trackingStart)) break
    const entry = normalizeEntry(data[key])
    if (hasMinutes(entry) && entry.minutes > 0) currentStreak += 1
    else break
  }

  return {
    totalMinutes,
    recordedDays,
    bestDay,
    bestDayMinutes,
    longestStreak,
    longestStreakEnd,
    currentStreak,
    bestMonth: bestMonth ? { year: bestMonth.year, month: bestMonth.month, average: bestMonth.average } : null,
    worstMonth: worstMonth ? { year: worstMonth.year, month: worstMonth.month, average: worstMonth.average } : null,
    mostMinutesMonth: mostMinutesMonth ? { year: mostMinutesMonth.year, month: mostMinutesMonth.month, total: mostMinutesMonth.total } : null,
    weekdayAverages: weekdayTotals.map((item, weekday) => ({
      weekday,
      average: item.count ? Math.round(item.total / item.count) : 0,
      count: item.count,
    })),
  }
}

export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

export function getAllDaysInData(data: OutdoorData, trackingStart: Date | null, today: Date): OutdoorData {
  const keys = Object.keys(data)
  if (keys.length === 0) return {}
  let minYear = Number.POSITIVE_INFINITY
  for (const key of keys) {
    const date = dateFromKey(key)
    if (date && date.getFullYear() < minYear) minYear = date.getFullYear()
  }
  if (!Number.isFinite(minYear)) return {}

  const result: OutdoorData = {}
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()
  for (let year = minYear; year <= todayYear; year += 1) {
    const lastMonth = year === todayYear ? todayMonth : 12
    for (let month = 1; month <= lastMonth; month += 1) {
      const lastDay = year === todayYear && month === todayMonth ? todayDay : new Date(year, month, 0).getDate()
      for (let day = 1; day <= lastDay; day += 1) {
        const key = `${year}-${month}-${day}`
        if (isBeforeStart(key, trackingStart)) continue
        result[key] = normalizeEntry(data[key])
      }
    }
  }
  return result
}

export function buildCsv(data: OutdoorData, trackingStart: Date | null, today: Date, header = 'Datum;Minuten;Notizen'): string {
  const filled = getAllDaysInData(data, trackingStart, today)
  const rows = [header]
  const keys = Object.keys(filled).sort((a, b) => (dateFromKey(a)?.getTime() ?? 0) - (dateFromKey(b)?.getTime() ?? 0))
  for (const key of keys) {
    const entry = normalizeEntry(filled[key])
    const minutes = entry.minutes === '' ? 0 : entry.minutes
    const note = entry.note.replace(/"/g, '""')
    rows.push(`${key};${minutes};"${note}"`)
  }
  return `${rows.join('\n')}\n`
}

export function encodeUtf16Le(text: string): ArrayBuffer {
  const buffer = new ArrayBuffer(2 + text.length * 2)
  const bytes = new Uint8Array(buffer)
  bytes[0] = 0xff
  bytes[1] = 0xfe
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    bytes[2 + index * 2] = code & 0xff
    bytes[3 + index * 2] = code >> 8
  }
  return buffer
}

function optionalString(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}

export function parseOutdoorBackup(value: unknown, today: Date): ParsedBackup | null {
  if (!isRecord(value) || !isRecord(value.outdoorData)) return null
  const todayDate = createLocalDate(today.getFullYear(), today.getMonth(), today.getDate())
  const outdoorData: OutdoorData = {}
  for (const [key, rawEntry] of Object.entries(value.outdoorData)) {
    const date = dateFromKey(key)
    if (!date || date.getTime() > todayDate.getTime()) continue
    outdoorData[dateKey(date)] = normalizeEntry(rawEntry)
  }

  const result: ParsedBackup = { outdoorData }
  if ('darkMode' in value) result.darkMode = optionalString(value.darkMode)
  if ('neonMode' in value) result.neonMode = optionalString(value.neonMode)
  if ('trackingStart' in value) result.trackingStart = optionalString(value.trackingStart)
  return result
}

export function serializeBackup(
  data: OutdoorData,
  trackingStart: Date | null,
  darkMode: boolean,
  neonMode: boolean,
  today: Date,
): OutdoorBackup {
  return {
    outdoorData: getAllDaysInData(data, trackingStart, today),
    darkMode: String(darkMode),
    neonMode: String(neonMode),
    trackingStart: trackingStart ? dateInputValue(trackingStart) : null,
  }
}

export function getMonthChartValues(year: number, month: number, data: OutdoorData, trackingStart: Date | null) {
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1
    const key = `${year}-${month + 1}-${day}`
    if (isBeforeStart(key, trackingStart)) return null
    const entry = normalizeEntry(data[key])
    return hasMinutes(entry) ? entry.minutes : 0
  })
}

export function getYearChartValues(year: number, data: OutdoorData, trackingStart: Date | null) {
  const values: Array<number | null> = []
  const labels: string[] = []
  for (let month = 0; month < 12; month += 1) {
    const days = new Date(year, month + 1, 0).getDate()
    for (let day = 1; day <= days; day += 1) {
      const key = `${year}-${month + 1}-${day}`
      labels.push(`${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`)
      if (isBeforeStart(key, trackingStart)) {
        values.push(null)
      } else {
        const entry = normalizeEntry(data[key])
        values.push(hasMinutes(entry) ? entry.minutes : 0)
      }
    }
  }
  return { labels, values }
}
