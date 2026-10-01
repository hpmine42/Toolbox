import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent, type TouchEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useTheme } from '../../theme/ThemeProvider'
import { Icon } from '../../components/icons'
import { readStorage, writeStorage, THEME_STORAGE_KEY } from '../../lib/storage'
import {
  dateFromKey,
  dateInputValue,
  dateKey,
  dateKeyFromInput,
  getAllTimeStats,
  getMonthChartValues,
  getMonthStats,
  getPeriodAverages,
  getPreviousMonth,
  getYearChartValues,
  hasMinutes,
  isBeforeStart,
  normalizeEntry,
  parseOutdoorBackup,
  parseOutdoorData,
  serializeBackup,
  encodeUtf16Le,
  buildCsv,
  OUTDOOR_DATA_KEY,
  TRACKING_START_KEY,
  LEGACY_DARK_MODE_KEY,
  NEON_MODE_KEY,
  type AllTimeStats,
  type MonthStats,
  type OutdoorData,
  type ParsedBackup,
} from './tracker'
import './outdoor-tracker.css'

ChartJS.register(BarController, BarElement, CategoryScale, Filler, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip)

type ActiveView = 'calendar' | 'year' | 'stats' | 'review'
type ConfirmationAction = 'reset-month' | 'reset-all' | 'clear-start'
type ModalState =
  | { type: 'entry' }
  | { type: 'month-picker' }
  | { type: 'start-date' }
  | { type: 'month-chart-download' }
  | { type: 'confirm'; action: ConfirmationAction }
  | { type: 'import-confirm' }

interface ReportCard {
  icon: string
  label: string
  value: string
  details: string[]
}

const MONTH_CHART_COLORS = {
  light: { red: '#f5a8ae', yellow: '#f5e580', lightgreen: '#93d49b', darkgreen: '#4caf62' },
  dark: { red: '#c0424e', yellow: '#b8960a', lightgreen: '#2e8c44', darkgreen: '#1c6b30' },
}

function localizeMonth(year: number, monthIndex: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1))
}

function localizeDate(date: Date, locale: string, withWeekday = false): string {
  return new Intl.DateTimeFormat(locale, {
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function localizeDateKey(key: string, locale: string, withWeekday = false): string {
  const date = dateFromKey(key)
  return date ? localizeDate(date, locale, withWeekday) : '–'
}

function localizedNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

function weekdayHeadings(t: TFunction): string[] {
  return WEEKDAY_KEYS.map((day) => t(`tools.outdoorTracker.calendar.weekdays.short.${day}`))
}

function minutesShort(minutes: number, t: TFunction): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return t('tools.outdoorTracker.duration.minutes', { count: minutes })
  if (remainder === 0) return t('tools.outdoorTracker.duration.hours', { count: hours })
  return t('tools.outdoorTracker.duration.hoursAndMinutes', { hours, minutes: remainder })
}

function minutesFull(minutes: number, t: TFunction): string {
  const minutesPerYear = 60 * 24 * 365
  const years = Math.floor(minutes / minutesPerYear)
  let remaining = minutes % minutesPerYear
  const days = Math.floor(remaining / (60 * 24))
  remaining %= 60 * 24
  const hours = Math.floor(remaining / 60)
  const remainder = remaining % 60
  const parts: string[] = []
  if (years > 0) parts.push(t('tools.outdoorTracker.duration.years', { count: years }))
  if (days > 0) parts.push(t('tools.outdoorTracker.duration.days', { count: days }))
  if (hours > 0) parts.push(t('tools.outdoorTracker.duration.hours', { count: hours }))
  if (remainder > 0) parts.push(t('tools.outdoorTracker.duration.minutes', { count: remainder }))
  return parts.join(', ') || t('tools.outdoorTracker.duration.zero')
}

function monthSummary(stats: MonthStats, previous: MonthStats, t: TFunction): string {
  if (stats.trackedDays === 0) return t('tools.outdoorTracker.review.summary.empty')

  const totalHours = Math.floor(stats.sum / 60)
  const totalMinutes = stats.sum % 60
  const duration = totalHours > 0
    ? t('tools.outdoorTracker.duration.hoursAndMinutes', { hours: totalHours, minutes: totalMinutes })
    : t('tools.outdoorTracker.duration.minutes', { count: stats.sum })
  const lines: string[] = []

  if (stats.average >= 90) lines.push(t('tools.outdoorTracker.review.summary.strong', { time: duration }))
  else if (stats.average >= 60) lines.push(t('tools.outdoorTracker.review.summary.solid', { time: duration }))
  else if (stats.average >= 30) lines.push(t('tools.outdoorTracker.review.summary.developing', { time: duration }))
  else lines.push(t('tools.outdoorTracker.review.summary.low', { time: duration }))

  const coverage = Math.round((stats.trackedDays / stats.daysInMonth) * 100)
  if (coverage >= 90) {
    lines.push(t('tools.outdoorTracker.review.summary.coverageExcellent', {
      trackedDays: stats.trackedDays,
      daysInMonth: stats.daysInMonth,
    }))
  } else if (coverage >= 60) {
    lines.push(t('tools.outdoorTracker.review.summary.coverageGood', {
      trackedDays: stats.trackedDays,
      daysInMonth: stats.daysInMonth,
    }))
  } else {
    lines.push(t('tools.outdoorTracker.review.summary.coverageLow', {
      trackedDays: stats.trackedDays,
      daysInMonth: stats.daysInMonth,
    }))
  }

  if (stats.longestStreak >= 10) {
    lines.push(t('tools.outdoorTracker.review.summary.streakExcellent', { count: stats.longestStreak }))
  } else if (stats.longestStreak >= 5) {
    lines.push(t('tools.outdoorTracker.review.summary.streakGood', { count: stats.longestStreak }))
  } else if (stats.longestStreak > 0) {
    lines.push(t('tools.outdoorTracker.review.summary.streakShort', { count: stats.longestStreak }))
  }

  if (previous.sum > 0) {
    const difference = stats.sum - previous.sum
    const percent = Math.round((difference / previous.sum) * 100)
    if (difference > 0) {
      lines.push(t('tools.outdoorTracker.review.summary.increase', {
        minutes: difference,
        percent: Math.abs(percent),
      }))
    } else if (difference < 0) {
      lines.push(t('tools.outdoorTracker.review.summary.decrease', {
        minutes: Math.abs(difference),
        percent: Math.abs(percent),
      }))
    }
  }

  return lines.join(' ')
}

function statsReportCards(stats: AllTimeStats, locale: string, t: TFunction): ReportCard[] {
  const monthName = (year: number, month: number) => localizeMonth(year, month - 1, locale)
  const bestWeekday = stats.weekdayAverages.reduce((best, item) => item.average > best.average ? item : best, { weekday: 0, average: 0, count: 0 })
  const bestWeekdayKey = WEEKDAY_KEYS[bestWeekday.weekday] ?? 'monday'
  const bestWeekdayName = t(`tools.outdoorTracker.calendar.weekdays.full.${bestWeekdayKey}`)
  const hours = Math.floor(stats.totalMinutes / 60)
  const remainingMinutes = stats.totalMinutes % 60

  return [
    {
      icon: '🏆',
      label: t('tools.outdoorTracker.stats.bestMonth'),
      value: stats.bestMonth
        ? t('tools.outdoorTracker.stats.monthAverageValue', {
          month: monthName(stats.bestMonth.year, stats.bestMonth.month),
          minutes: localizedNumber(stats.bestMonth.average, locale),
        })
        : '–',
      details: stats.bestMonth ? [minutesShort(stats.bestMonth.average, t)] : [],
    },
    {
      icon: '📉',
      label: t('tools.outdoorTracker.stats.worstMonth'),
      value: stats.worstMonth
        ? t('tools.outdoorTracker.stats.monthAverageValue', {
          month: monthName(stats.worstMonth.year, stats.worstMonth.month),
          minutes: localizedNumber(stats.worstMonth.average, locale),
        })
        : '–',
      details: stats.worstMonth ? [minutesShort(stats.worstMonth.average, t)] : [],
    },
    {
      icon: '⭐',
      label: t('tools.outdoorTracker.stats.bestDay'),
      value: stats.bestDay
        ? t('tools.outdoorTracker.stats.bestDayValue', {
          date: localizeDateKey(stats.bestDay, locale, true),
          minutes: localizedNumber(stats.bestDayMinutes, locale),
        })
        : '–',
      details: stats.bestDay ? [minutesShort(stats.bestDayMinutes, t)] : [],
    },
    {
      icon: '🔥',
      label: t('tools.outdoorTracker.stats.longestStreak'),
      value: stats.longestStreak > 0
        ? t('tools.outdoorTracker.stats.streakValue', {
          count: stats.longestStreak,
          date: stats.longestStreakEnd ? localizeDateKey(stats.longestStreakEnd, locale) : '',
        })
        : '–',
      details: [],
    },
    {
      icon: '⚡',
      label: t('tools.outdoorTracker.stats.currentStreak'),
      value: stats.currentStreak > 0
        ? t('tools.outdoorTracker.stats.currentStreakValue', { count: stats.currentStreak })
        : t('tools.outdoorTracker.stats.noCurrentStreak'),
      details: [],
    },
    {
      icon: '⏱️',
      label: t('tools.outdoorTracker.stats.totalTime'),
      value: stats.recordedDays > 0
        ? t('tools.outdoorTracker.stats.totalMinutes', { minutes: localizedNumber(stats.totalMinutes, locale) })
        : '–',
      details: stats.recordedDays > 0
        ? [
          t('tools.outdoorTracker.stats.hoursAndMinutes', {
            hours: localizedNumber(hours, locale),
            minutes: localizedNumber(remainingMinutes, locale),
          }),
          minutesFull(stats.totalMinutes, t),
          t('tools.outdoorTracker.stats.recordedDays', { count: stats.recordedDays }),
        ]
        : [],
    },
    {
      icon: '📅',
      label: t('tools.outdoorTracker.stats.mostMinutesMonth'),
      value: stats.mostMinutesMonth
        ? t('tools.outdoorTracker.stats.monthTotalValue', {
          month: monthName(stats.mostMinutesMonth.year, stats.mostMinutesMonth.month),
          minutes: localizedNumber(stats.mostMinutesMonth.total, locale),
        })
        : '–',
      details: stats.mostMinutesMonth ? [minutesShort(stats.mostMinutesMonth.total, t)] : [],
    },
    {
      icon: '📆',
      label: t('tools.outdoorTracker.stats.bestWeekday'),
      value: bestWeekday.count > 0
        ? t('tools.outdoorTracker.stats.weekdayAverageValue', {
          weekday: bestWeekdayName,
          minutes: localizedNumber(bestWeekday.average, locale),
        })
        : '–',
      details: bestWeekday.count > 0 ? [minutesShort(bestWeekday.average, t)] : [],
    },
  ]
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character] ?? character
  })
}

function htmlReport(title: string, subtitle: string, content: string, footer: string, locale: string): string {
  const language = locale.toLowerCase().startsWith('en') ? 'en' : 'de'
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:2rem 1rem;font:16px/1.5 system-ui,-apple-system,sans-serif;background:#f3f0e8;color:#1c1915}.report{width:min(48rem,100%);margin:auto}.report-header{text-align:center;margin-bottom:1.5rem}.report-header h1{font-size:1.65rem;line-height:1.2;margin:0;color:#0b5c51}.report-header p{color:#4a453e;margin:.5rem 0 0}.report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.report-card,.report-summary,.report-dots{background:#fffcf7;border:1px solid #e0d9cc;border-radius:8px;padding:1rem}.report-card h2{font-size:.85rem;color:#0b5c51;margin:0 0 .45rem}.report-card strong{display:block;font-size:1.05rem;overflow-wrap:anywhere}.report-card p{margin:.3rem 0 0;color:#4a453e;font-size:.9rem}.report-summary,.report-dots{margin-top:1rem}.report-summary h2,.report-dots h2{font-size:.9rem;margin:0 0 .55rem}.report-dots-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.25rem}.report-dot{height:1.1rem;border-radius:3px}.report-legend{display:flex;flex-wrap:wrap;gap:.55rem 1rem;margin-top:.75rem;font-size:.8rem;color:#4a453e}.report-legend span{display:inline-flex;align-items:center;gap:.35rem}.report-swatch{width:.65rem;height:.65rem;border-radius:2px}.report-footer{text-align:center;margin-top:1.5rem;color:#4a453e;font-size:.85rem}
@media(max-width:34rem){body{padding:1rem .75rem}.report-grid{grid-template-columns:1fr}}
</style>
</head>
<body><main class="report"><header class="report-header"><span aria-hidden="true">🌿</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>${content}<footer class="report-footer">${escapeHtml(footer)}</footer></main></body></html>`
}

function makeDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null): void {
  if (event.key !== 'Tab' || !container) return
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getAttribute('aria-hidden') !== 'true' && !element.closest('[hidden], [inert], [aria-hidden="true"]'))
  if (focusable.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export default function OutdoorTrackerTool() {
  const { t, i18n } = useTranslation()
  const { resolved, setPreference } = useTheme()
  const prefix = useId().replace(/:/g, '')
  const locale = i18n.resolvedLanguage || i18n.language || 'de'
  const today = new Date()
  const todayKey = dateKey(today)
  const [data, setData] = useState<OutdoorData>(() => parseOutdoorData(readStorage(OUTDOOR_DATA_KEY)))
  const [trackingStart, setTrackingStart] = useState<Date | null>(() => {
    const stored = readStorage(TRACKING_START_KEY)
    return stored ? dateKeyFromInput(stored) : null
  })
  const [neonMode, setNeonMode] = useState(() => readStorage(NEON_MODE_KEY) === 'true')
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [activeView, setActiveView] = useState<ActiveView>('calendar')
  const [monthAnimation, setMonthAnimation] = useState<'next' | 'previous' | null>(null)
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear())
  const [reviewYear, setReviewYear] = useState(() => new Date().getFullYear())
  const [reviewMonth, setReviewMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [minutesDraft, setMinutesDraft] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [startDateDraft, setStartDateDraft] = useState('')
  const [dialog, setDialog] = useState<ModalState | null>(null)
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null)
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const monthCanvasRef = useRef<HTMLCanvasElement>(null)
  const yearCanvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartJS | null>(null)
  const neonCanvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const minutesInputRef = useRef<HTMLInputElement>(null)
  const startDateInputRef = useRef<HTMLInputElement>(null)
  const holdTimerRef = useRef<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const previousDialogFocusRef = useRef<HTMLElement | null>(null)
  const previousMenuFocusRef = useRef<HTMLElement | null>(null)

  const monthName = useMemo(
    () => localizeMonth(currentDate.getFullYear(), currentDate.getMonth(), locale),
    [currentDate, locale],
  )
  const monthDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const monthValues = useMemo(
    () => getMonthChartValues(currentDate.getFullYear(), currentDate.getMonth(), data, trackingStart),
    [currentDate, data, trackingStart],
  )
  const monthLabels = useMemo(() => Array.from({ length: monthDays }, (_, index) => index + 1), [monthDays])
  const yearChartData = useMemo(
    () => getYearChartValues(currentDate.getFullYear(), data, trackingStart),
    [currentDate, currentDate.getFullYear(), trackingStart],
  )
  const averages = useMemo(
    () => getPeriodAverages(data, currentDate.getFullYear(), currentDate.getMonth(), trackingStart),
    [data, currentDate, trackingStart],
  )
  const allTimeStats = useMemo(() => getAllTimeStats(data, trackingStart, today), [data, trackingStart, todayKey])
  const reviewStats = useMemo(() => getMonthStats(reviewYear, reviewMonth, data, trackingStart), [reviewYear, reviewMonth, data, trackingStart])
  const previousReviewDate = getPreviousMonth(reviewYear, reviewMonth)
  const previousReviewStats = useMemo(
    () => getMonthStats(previousReviewDate.year, previousReviewDate.month, data, trackingStart),
    [previousReviewDate.year, previousReviewDate.month, data, trackingStart],
  )
  const monthLabelId = `${prefix}-month-label`
  const modalHeadingId = `${prefix}-modal-heading`
  const entryMinutesId = `${prefix}-minutes`
  const entryNoteId = `${prefix}-note`
  const startDateId = `${prefix}-tracking-start`
  const weekdays = useMemo(() => weekdayHeadings(t), [locale, t])

  const closeModal = useCallback(() => setDialog(null), [])

  function openModal(next: ModalState) {
    if (!dialog) {
      const active = document.activeElement
      previousDialogFocusRef.current = menuOpen && previousMenuFocusRef.current
        ? previousMenuFocusRef.current
        : active instanceof HTMLElement ? active : null
    }
    setDialog(next)
  }

  function openMenu() {
    const active = document.activeElement
    previousMenuFocusRef.current = active instanceof HTMLElement ? active : null
    setMenuOpen(true)
  }

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    writeStorage(OUTDOOR_DATA_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    try {
      if (trackingStart) localStorage.setItem(TRACKING_START_KEY, dateInputValue(trackingStart))
      else localStorage.removeItem(TRACKING_START_KEY)
    } catch {
      // Tracking remains available in memory when storage is unavailable.
    }
  }, [trackingStart])

  useEffect(() => {
    writeStorage(NEON_MODE_KEY, String(neonMode))
  }, [neonMode])

  useEffect(() => {
    if (readStorage(THEME_STORAGE_KEY) !== null) return
    if (readStorage(NEON_MODE_KEY) === 'true') return
    const legacyDarkMode = readStorage(LEGACY_DARK_MODE_KEY)
    if (legacyDarkMode === 'true' || legacyDarkMode === 'false') {
      setPreference(legacyDarkMode === 'true' ? 'dark' : 'light')
    }
    // Migrate the former tracker-only setting to Toolbox's shared theme preference once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!dialog) {
      const previous = previousDialogFocusRef.current
      previousDialogFocusRef.current = null
      if (previous?.isConnected) previous.focus()
      return
    }
    const node = dialogRef.current
    const target = dialog.type === 'entry'
      ? minutesInputRef.current
      : dialog.type === 'start-date'
        ? startDateInputRef.current
        : node?.querySelector<HTMLElement>('[data-autofocus]')
          ?? node?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])')
    target?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeModal()
      } else {
        trapFocus(event, node)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dialog, closeModal])

  useEffect(() => {
    if (!menuOpen) {
      const previous = previousMenuFocusRef.current
      previousMenuFocusRef.current = null
      if (!dialog && previous?.isConnected) previous.focus()
      return
    }
    const node = menuRef.current
    node?.querySelector<HTMLElement>('button:not([disabled])')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
      } else {
        trapFocus(event, node)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, dialog, closeMenu])

  useEffect(() => {
    if (!monthAnimation) return
    const timeout = window.setTimeout(() => setMonthAnimation(null), 340)
    return () => window.clearTimeout(timeout)
  }, [monthAnimation])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 2500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!neonMode || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = rootRef.current
    const canvas = neonCanvasRef.current
    const context = canvas?.getContext('2d')
    if (!root || !canvas || !context) return

    const colors = ['#ff00ff', '#00ffff', '#ff0066', '#66ff00', '#ff9900', '#0066ff']
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string; alpha: number }> = []
    let width = 0
    let height = 0
    let frame = 0

    const resize = () => {
      const rect = root.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(rect.width, 1)
      height = Math.max(root.scrollHeight, rect.height, 1)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      canvas.style.height = `${height}px`
      if (particles.length === 0) {
        for (let index = 0; index < 34; index += 1) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: Math.random() * 1.7 + 0.8,
            color: colors[Math.floor(Math.random() * colors.length)] ?? '#00ffff',
            alpha: Math.random() * 0.45 + 0.25,
          })
        }
      }
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      for (let first = 0; first < particles.length; first += 1) {
        const particle = particles[first]
        if (!particle) continue
        for (let second = first + 1; second < particles.length; second += 1) {
          const other = particles[second]
          if (!other) continue
          const dx = particle.x - other.x
          const dy = particle.y - other.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance >= 120) continue
          context.save()
          context.globalAlpha = (1 - distance / 120) * 0.28
          context.strokeStyle = particle.color
          context.lineWidth = 0.8
          context.beginPath()
          context.moveTo(particle.x, particle.y)
          context.lineTo(other.x, other.y)
          context.stroke()
          context.restore()
        }
      }
      for (const particle of particles) {
        context.save()
        context.globalAlpha = particle.alpha
        context.fillStyle = particle.color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fill()
        context.restore()
        particle.x += particle.vx
        particle.y += particle.vy
        if (particle.x < 0 || particle.x > width) particle.vx *= -1
        if (particle.y < 0 || particle.y > height) particle.vy *= -1
      }
      frame = window.requestAnimationFrame(draw)
    }

    resize()
    draw()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(root)
    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      context.clearRect(0, 0, width, height)
    }
  }, [neonMode])

  useEffect(() => {
    if (typeof CanvasRenderingContext2D === 'undefined') return
    const canvas = activeView === 'calendar' ? monthCanvasRef.current : activeView === 'year' ? yearCanvasRef.current : null
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const dark = resolved === 'dark'
    const palette = dark ? MONTH_CHART_COLORS.dark : MONTH_CHART_COLORS.light
    const textColor = neonMode ? '#ffffff' : dark ? '#f4f0e8' : '#1c1915'
    const gridColor = neonMode ? 'rgba(255,255,255,0.2)' : dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)'
    const chartLabel = t('tools.outdoorTracker.chart.minutesOutside')
    const tooltipLabel = (minutes: number) => t('tools.outdoorTracker.chart.tooltip', { minutes: localizedNumber(minutes, locale) })

    const chart = activeView === 'calendar'
      ? new ChartJS(context, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [{
            label: chartLabel,
            data: monthValues,
            backgroundColor: monthValues.map((minutes) => {
              if (minutes === null) return 'rgba(150,160,140,0.16)'
              if (minutes < 30) return palette.red
              if (minutes < 60) return palette.yellow
              if (minutes < 90) return palette.lightgreen
              return palette.darkgreen
            }),
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: { callbacks: { label: (item) => tooltipLabel(item.parsed.y ?? 0) } },
          },
          scales: {
            x: { ticks: { color: textColor, autoSkip: true, maxTicksLimit: 16 }, grid: { color: gridColor } },
            y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
          },
        },
      })
      : new ChartJS(context, {
        type: 'line',
        data: {
          labels: yearChartData.labels,
          datasets: [{
            label: chartLabel,
            data: yearChartData.values,
            borderColor: neonMode ? '#ff00ff' : dark ? '#72b85a' : '#3a8c28',
            backgroundColor: neonMode ? 'rgba(255,0,255,0.18)' : dark ? 'rgba(114,184,90,0.2)' : 'rgba(58,140,40,0.16)',
            fill: true,
            tension: 0.25,
            pointRadius: 1.5,
            pointHoverRadius: 4,
            spanGaps: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor } },
            tooltip: {
              callbacks: {
                label: (item) => tooltipLabel(item.parsed.y ?? 0),
              },
            },
          },
          scales: {
            x: { ticks: { color: textColor, autoSkip: true, maxTicksLimit: 12, maxRotation: 0 }, grid: { color: gridColor } },
            y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
          },
        },
      })

    chartRef.current = chart
    return () => {
      chart.destroy()
      if (chartRef.current === chart) chartRef.current = null
    }
  }, [activeView, currentDate, data, locale, monthLabels, monthValues, neonMode, resolved, t, yearChartData])

  function openEntry(key: string) {
    setSelectedDate(key)
    const entry = normalizeEntry(data[key])
    setMinutesDraft(entry.minutes === '' ? '' : String(entry.minutes))
    setNoteDraft(entry.note)
    openModal({ type: 'entry' })
  }

  function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDate) return
    const parsed = Number.parseInt(minutesDraft, 10)
    if (Number.isFinite(parsed)) {
      setData((current) => ({
        ...current,
        [selectedDate]: { minutes: parsed, note: noteDraft.trim() },
      }))
      setStatus(t('tools.outdoorTracker.status.entrySaved'))
    }
    closeModal()
  }

  function deleteEntry() {
    if (!selectedDate) return
    setData((current) => {
      const next = { ...current }
      delete next[selectedDate]
      return next
    })
    closeModal()
    setStatus(t('tools.outdoorTracker.status.entryDeleted'))
  }

  function changeMonth(offset: number) {
    setMonthAnimation(offset > 0 ? 'next' : 'previous')
    setCurrentDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function openMonthPicker() {
    setMonthPickerYear(currentDate.getFullYear())
    openModal({ type: 'month-picker' })
  }

  function selectMonth(monthIndex: number) {
    setCurrentDate(new Date(monthPickerYear, monthIndex, 1))
    setMonthAnimation(null)
    closeModal()
  }

  function openStartDateDialog() {
    closeMenu()
    setStartDateDraft(trackingStart ? dateInputValue(trackingStart) : '')
    openModal({ type: 'start-date' })
  }

  function saveStartDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startDateDraft === '') {
      closeModal()
      return
    }
    const parsed = dateKeyFromInput(startDateDraft)
    if (!parsed) {
      setStatus(t('tools.outdoorTracker.status.invalidDate'))
      return
    }
    setTrackingStart(parsed)
    closeModal()
    setStatus(t('tools.outdoorTracker.status.startDateSaved'))
  }

  function askForConfirmation(action: ConfirmationAction) {
    closeMenu()
    openModal({ type: 'confirm', action })
  }

  function runConfirmation() {
    if (!dialog || dialog.type !== 'confirm') return
    if (dialog.action === 'reset-month') {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      setData((current) => Object.fromEntries(Object.entries(current).filter(([key]) => {
        const date = dateFromKey(key)
        return !date || date.getFullYear() !== year || date.getMonth() !== month
      })))
      setStatus(t('tools.outdoorTracker.status.monthReset'))
    } else if (dialog.action === 'reset-all') {
      setData({})
      setStatus(t('tools.outdoorTracker.status.allReset'))
    } else {
      setTrackingStart(null)
      setStatus(t('tools.outdoorTracker.status.startDateCleared'))
    }
    closeModal()
  }

  function openStats() {
    closeMenu()
    setActiveView('stats')
  }

  function openYear() {
    closeMenu()
    setActiveView('year')
  }

  function openReview() {
    closeMenu()
    setReviewYear(currentDate.getFullYear())
    setReviewMonth(currentDate.getMonth() + 1)
    setActiveView('review')
  }

  function returnToCalendar() {
    setActiveView('calendar')
  }

  function changeReviewMonth(offset: number) {
    const next = new Date(reviewYear, reviewMonth - 1 + offset, 1)
    setReviewYear(next.getFullYear())
    setReviewMonth(next.getMonth() + 1)
  }

  function toggleNeonMode() {
    setNeonMode((current) => !current)
    closeMenu()
  }

  function exportJson() {
    const backup = serializeBackup(data, trackingStart, resolved === 'dark', neonMode, new Date())
    makeDownload(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), t('tools.outdoorTracker.files.backup'))
    setStatus(t('tools.outdoorTracker.status.exportStarted'))
    closeMenu()
  }

  function exportCsv() {
    const bytes = encodeUtf16Le(buildCsv(data, trackingStart, new Date(), t('tools.outdoorTracker.csvHeader')))
    makeDownload(new Blob([bytes], { type: 'text/csv;charset=utf-16le' }), t('tools.outdoorTracker.files.csv'))
    setStatus(t('tools.outdoorTracker.status.exportStarted'))
    closeMenu()
  }

  function exportAll() {
    const backup = serializeBackup(data, trackingStart, resolved === 'dark', neonMode, new Date())
    const csv = encodeUtf16Le(buildCsv(data, trackingStart, new Date(), t('tools.outdoorTracker.csvHeader')))
    makeDownload(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), t('tools.outdoorTracker.files.backup'))
    makeDownload(new Blob([csv], { type: 'text/csv;charset=utf-16le' }), t('tools.outdoorTracker.files.csv'))
    setStatus(t('tools.outdoorTracker.status.exportStarted'))
    closeMenu()
  }

  function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseOutdoorBackup(JSON.parse(String(reader.result)) as unknown, new Date())
        if (!parsed) {
          setStatus(t('tools.outdoorTracker.status.importInvalid'))
          return
        }
        setPendingImport(parsed)
        openModal({ type: 'import-confirm' })
      } catch {
        setStatus(t('tools.outdoorTracker.status.importInvalid'))
      }
    }
    reader.onerror = () => setStatus(t('tools.outdoorTracker.status.importInvalid'))
    reader.readAsText(file)
  }

  function confirmImport() {
    if (!pendingImport) return
    setData(pendingImport.outdoorData)
    if (pendingImport.darkMode === 'true' || pendingImport.darkMode === 'false') {
      const dark = pendingImport.darkMode === 'true'
      setPreference(dark ? 'dark' : 'light')
      writeStorage(LEGACY_DARK_MODE_KEY, String(dark))
    }
    if (pendingImport.neonMode === 'true' || pendingImport.neonMode === 'false') {
      setNeonMode(pendingImport.neonMode === 'true')
    }
    if (pendingImport.trackingStart !== undefined) {
      const nextStart = pendingImport.trackingStart ? dateKeyFromInput(pendingImport.trackingStart) : null
      if (pendingImport.trackingStart === null || nextStart) setTrackingStart(nextStart)
    }
    setPendingImport(null)
    closeModal()
    setStatus(t('tools.outdoorTracker.status.importSuccess'))
  }

  function openImportPicker() {
    closeMenu()
    importInputRef.current?.click()
  }

  function beginChartHold(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null
      openModal({ type: 'month-chart-download' })
    }, 1000)
  }

  function cancelChartHold() {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }

  function downloadChartImage(kind: 'month' | 'year') {
    const canvas = kind === 'month' ? monthCanvasRef.current : yearCanvasRef.current
    if (!canvas) return
    const scale = Math.min(1, 900 / Math.max(canvas.width, 1))
    const width = Math.max(1, Math.round(canvas.width * scale))
    const height = Math.max(1, Math.round(canvas.height * scale))
    const headingHeight = kind === 'month' ? 44 : 0
    const padding = 20
    const output = document.createElement('canvas')
    output.width = width + padding * 2
    output.height = height + padding * 2 + headingHeight
    const context = output.getContext('2d')
    if (!context) return

    const dark = resolved === 'dark'
    context.fillStyle = neonMode ? '#000000' : dark ? '#1a2019' : '#f8faf6'
    context.fillRect(0, 0, output.width, output.height)
    if (kind === 'month') {
      context.fillStyle = neonMode || dark ? '#ffffff' : '#1a2218'
      context.font = '700 18px system-ui, sans-serif'
      context.textAlign = 'left'
      context.fillText(`🌿 ${t('tools.outdoorTracker.chart.monthTitle', { month: monthName })}`, padding, 30)
    }
    context.drawImage(canvas, padding, padding + headingHeight, width, height)
    context.font = '12px system-ui, sans-serif'
    context.textAlign = 'right'
    context.fillStyle = neonMode ? 'rgba(0,255,255,.55)' : dark ? 'rgba(200,230,180,.45)' : 'rgba(60,100,40,.45)'
    context.fillText(t('tools.outdoorTracker.chart.watermark'), output.width - padding, output.height - 6)

    const link = document.createElement('a')
    link.download = kind === 'month'
      ? t('tools.outdoorTracker.files.monthChart', { year: currentDate.getFullYear(), month: String(currentDate.getMonth() + 1).padStart(2, '0') })
      : t('tools.outdoorTracker.files.yearChart', { year: currentDate.getFullYear() })
    link.href = output.toDataURL('image/png')
    link.click()
    if (kind === 'month') {
      closeModal()
      setToast(t('tools.outdoorTracker.chart.downloaded', { month: monthName }))
      setStatus(t('tools.outdoorTracker.status.chartSaved'))
    } else {
      setStatus(t('tools.outdoorTracker.status.chartSaved'))
    }
  }

  function downloadStatsReport() {
    const stats = statsReportCards(allTimeStats, locale, t)
    const cards = stats.map((card) => `<article class="report-card"><h2>${escapeHtml(`${card.icon} ${card.label}`)}</h2><strong>${escapeHtml(card.value)}</strong>${card.details.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</article>`).join('')
    const date = localizeDate(new Date(), locale)
    const content = `<section class="report-grid">${cards}</section>`
    const report = htmlReport(
      t('tools.outdoorTracker.reports.statsTitle'),
      t('tools.outdoorTracker.reports.createdOn', { date }),
      content,
      t('tools.outdoorTracker.reports.footer'),
      locale,
    )
    makeDownload(new Blob([report], { type: 'text/html;charset=utf-8' }), t('tools.outdoorTracker.files.statsReport', { date: dateInputValue(new Date()) }))
    setStatus(t('tools.outdoorTracker.status.exportStarted'))
  }

  function downloadMonthlyReport() {
    const previousMonthName = localizeMonth(previousReviewDate.year, previousReviewDate.month - 1, locale)
    const difference = reviewStats.sum - previousReviewStats.sum
    const percent = previousReviewStats.sum > 0 ? Math.round((difference / previousReviewStats.sum) * 100) : null
    const compareText = previousReviewStats.sum > 0
      ? difference > 0
        ? t('tools.outdoorTracker.review.comparison.increase', { minutes: difference, percent: Math.abs(percent ?? 0) })
        : difference < 0
          ? t('tools.outdoorTracker.review.comparison.decrease', { minutes: Math.abs(difference), percent: Math.abs(percent ?? 0) })
          : t('tools.outdoorTracker.review.comparison.same')
      : t('tools.outdoorTracker.review.comparison.noPrevious')
    const compactTotal = minutesShort(reviewStats.sum, t)
    const monthCards: ReportCard[] = [
      {
        icon: '📅', label: t('tools.outdoorTracker.review.trackedDays'),
        value: t('tools.outdoorTracker.review.daysOfMonth', { tracked: reviewStats.trackedDays, total: reviewStats.daysInMonth }),
        details: [t('tools.outdoorTracker.review.daysWithoutEntry', { count: reviewStats.daysInMonth - reviewStats.trackedDays })],
      },
      {
        icon: '⌀', label: t('tools.outdoorTracker.review.averagePerTrackedDay'),
        value: t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(reviewStats.average, locale) }),
        details: [t('tools.outdoorTracker.review.averagePerCalendarDay', { minutes: localizedNumber(reviewStats.averagePerCalendarDay, locale) })],
      },
      {
        icon: '⭐', label: t('tools.outdoorTracker.review.bestDay'),
        value: reviewStats.bestMinutes > 0 ? t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(reviewStats.bestMinutes, locale) }) : '–',
        details: [localizeDateKey(reviewStats.bestDay ?? '', locale, true)],
      },
      {
        icon: '📉', label: t('tools.outdoorTracker.review.worstDay'),
        value: reviewStats.worstDay ? t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(reviewStats.worstMinutes, locale) }) : '–',
        details: [localizeDateKey(reviewStats.worstDay ?? '', locale, true)],
      },
      {
        icon: '🔥', label: t('tools.outdoorTracker.review.longestStreak'),
        value: reviewStats.longestStreak > 0 ? t('tools.outdoorTracker.review.daysValue', { count: reviewStats.longestStreak }) : '–',
        details: [reviewStats.longestStreakEnd ? t('tools.outdoorTracker.review.untilDate', { date: localizeDateKey(reviewStats.longestStreakEnd, locale) }) : ''],
      },
      {
        icon: '📊', label: t('tools.outdoorTracker.review.previousMonthCard', { month: previousMonthName }),
        value: previousReviewStats.sum > 0 ? minutesShort(previousReviewStats.sum, t) : previousReviewStats.trackedDays > 0 ? t('tools.outdoorTracker.review.minutesValue', { minutes: previousReviewStats.sum }) : '–',
        details: [previousReviewStats.trackedDays > 0
          ? t('tools.outdoorTracker.review.previousMonthDetails', { days: previousReviewStats.trackedDays, minutes: previousReviewStats.average })
          : t('tools.outdoorTracker.review.noData')],
      },
    ]
    const cardHtml = monthCards.map((card) => `<article class="report-card"><h2>${escapeHtml(`${card.icon} ${card.label}`)}</h2><strong>${escapeHtml(card.value)}</strong>${card.details.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('')}</article>`).join('')
    const dots = reviewStats.entries.map((entry) => {
      const color = entry.beforeStart || entry.minutes === null || entry.minutes === 0
        ? '#d7ded2'
        : entry.minutes < 30 ? '#f5a8ae'
          : entry.minutes < 60 ? '#f5e580'
            : entry.minutes < 90 ? '#93d49b' : '#4caf62'
      const label = entry.beforeStart
        ? t('tools.outdoorTracker.review.beforeStart')
        : entry.minutes === null || entry.minutes === 0
          ? t('tools.outdoorTracker.review.zeroMinutes')
          : t('tools.outdoorTracker.review.minutesValue', { minutes: entry.minutes })
      return `<span class="report-dot" style="background:${color}" title="${escapeHtml(`${localizeDateKey(entry.key, locale)}: ${label}`)}"></span>`
    }).join('')
    const legend = ([
      ['#4caf62', t('tools.outdoorTracker.review.legend.high')],
      ['#93d49b', t('tools.outdoorTracker.review.legend.good')],
      ['#f5e580', t('tools.outdoorTracker.review.legend.low')],
      ['#f5a8ae', t('tools.outdoorTracker.review.legend.short')],
    ] as const).map(([color, label]) => `<span><i class="report-swatch" style="background:${color}"></i>${escapeHtml(label)}</span>`).join('')
    const content = `<section class="report-summary"><h2>${escapeHtml(t('tools.outdoorTracker.review.totalOutside'))}</h2><p><strong>${escapeHtml(compactTotal)}</strong> · ${escapeHtml(compareText)}</p></section><section class="report-grid">${cardHtml}</section><section class="report-dots"><h2>${escapeHtml(t('tools.outdoorTracker.review.activityHistory'))}</h2><div class="report-dots-grid">${dots}</div><div class="report-legend">${legend}</div></section><section class="report-summary"><h2>${escapeHtml(t('tools.outdoorTracker.review.summaryTitle'))}</h2><p>${escapeHtml(monthSummary(reviewStats, previousReviewStats, t))}</p></section>`
    const report = htmlReport(
      t('tools.outdoorTracker.reports.monthTitle', { month: localizeMonth(reviewYear, reviewMonth - 1, locale) }),
      t('tools.outdoorTracker.reports.createdOn', { date: localizeDate(new Date(), locale) }),
      content,
      t('tools.outdoorTracker.reports.footer'),
      locale,
    )
    makeDownload(new Blob([report], { type: 'text/html;charset=utf-8' }), t('tools.outdoorTracker.files.monthReport', { year: reviewYear, month: String(reviewMonth).padStart(2, '0') }))
    setStatus(t('tools.outdoorTracker.status.exportStarted'))
  }

  function changeDarkTheme() {
    if (neonMode) setNeonMode(false)
    const next = resolved === 'dark' ? 'light' : 'dark'
    setPreference(next)
    writeStorage(LEGACY_DARK_MODE_KEY, String(next === 'dark'))
    closeMenu()
  }

  function onCalendarTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0]
    if (!touch) return
    touchStartRef.current = { x: touch.screenX, y: touch.screenY, moved: false }
  }

  function onCalendarTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    if (Math.abs(touch.screenX - start.x) > 10 || Math.abs(touch.screenY - start.y) > 10) start.moved = true
  }

  function onCalendarTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    if (!start || !touch || !start.moved) {
      touchStartRef.current = null
      return
    }
    const dx = start.x - touch.screenX
    const dy = touch.screenY - start.y
    const angle = Math.abs(Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI)
    if (Math.abs(dx) > 50 && angle < 35) changeMonth(dx > 0 ? 1 : -1)
    touchStartRef.current = null
  }

  const displayedTheme = resolved === 'dark' ? t('tools.outdoorTracker.menu.darkModeOn') : t('tools.outdoorTracker.menu.darkModeOff')
  const titleDate = selectedDate ? localizeDateKey(selectedDate, locale, true) : ''
  const startDateBadge = trackingStart ? localizeDate(trackingStart, locale) : ''
  const reviewMonthTitle = localizeMonth(reviewYear, reviewMonth - 1, locale)
  const monthAverageText = averages.month === null
    ? t('tools.outdoorTracker.averageEmpty')
    : t('tools.outdoorTracker.averageValue', { minutes: localizedNumber(averages.month, locale) })
  const yearAverageText = averages.year === null
    ? t('tools.outdoorTracker.averageEmpty')
    : t('tools.outdoorTracker.averageValue', { minutes: localizedNumber(averages.year, locale) })

  const monthStatsCards: ReportCard[] = [
    {
      icon: '📅', label: t('tools.outdoorTracker.review.trackedDays'),
      value: t('tools.outdoorTracker.review.daysOfMonth', { tracked: reviewStats.trackedDays, total: reviewStats.daysInMonth }),
      details: [t('tools.outdoorTracker.review.daysWithoutEntry', { count: reviewStats.daysInMonth - reviewStats.trackedDays })],
    },
    {
      icon: '⌀', label: t('tools.outdoorTracker.review.averagePerTrackedDay'),
      value: t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(reviewStats.average, locale) }),
      details: [t('tools.outdoorTracker.review.averagePerCalendarDay', { minutes: localizedNumber(reviewStats.averagePerCalendarDay, locale) })],
    },
    {
      icon: '⭐', label: t('tools.outdoorTracker.review.bestDay'),
      value: reviewStats.bestMinutes > 0 ? t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(reviewStats.bestMinutes, locale) }) : '–',
      details: [localizeDateKey(reviewStats.bestDay ?? '', locale, true)],
    },
    {
      icon: '📉', label: t('tools.outdoorTracker.review.worstDay'),
      value: reviewStats.worstDay ? t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(reviewStats.worstMinutes, locale) }) : '–',
      details: [localizeDateKey(reviewStats.worstDay ?? '', locale, true)],
    },
    {
      icon: '🔥', label: t('tools.outdoorTracker.review.longestStreak'),
      value: reviewStats.longestStreak > 0 ? t('tools.outdoorTracker.review.daysValue', { count: reviewStats.longestStreak }) : '–',
      details: [reviewStats.longestStreakEnd ? t('tools.outdoorTracker.review.untilDate', { date: localizeDateKey(reviewStats.longestStreakEnd, locale) }) : ''],
    },
    {
      icon: '📊', label: t('tools.outdoorTracker.review.previousMonthCard', { month: localizeMonth(previousReviewDate.year, previousReviewDate.month - 1, locale) }),
      value: previousReviewStats.sum > 0
        ? minutesShort(previousReviewStats.sum, t)
        : previousReviewStats.trackedDays > 0
          ? t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(previousReviewStats.sum, locale) })
          : '–',
      details: [previousReviewStats.trackedDays > 0
        ? t('tools.outdoorTracker.review.previousMonthDetails', { days: previousReviewStats.trackedDays, minutes: previousReviewStats.average })
        : t('tools.outdoorTracker.review.noData')],
    },
  ]

  const formattedAllTimeStats = statsReportCards(allTimeStats, locale, t)
  const confirmationTitle = dialog?.type === 'confirm'
    ? t(`tools.outdoorTracker.confirm.${dialog.action}.title`)
    : ''
  const confirmationBody = dialog?.type === 'confirm'
    ? t(`tools.outdoorTracker.confirm.${dialog.action}.body`, { month: monthName })
    : ''

  return (
    <div
      ref={rootRef}
      className="outdoor-tracker"
      data-theme={resolved}
      data-neon={neonMode ? 'true' : 'false'}
    >
      {neonMode ? <canvas ref={neonCanvasRef} className="outdoor-neon-canvas" aria-hidden="true" /> : null}
      <div className="outdoor-content">
        <header className="outdoor-topbar">
          <h2>{t('tools.outdoorTracker.heading')}</h2>
          <button
            type="button"
            className="outdoor-menu-trigger"
            aria-label={menuOpen ? t('tools.outdoorTracker.menu.close') : t('tools.outdoorTracker.menu.open')}
            aria-expanded={menuOpen}
            aria-controls={`${prefix}-sidebar`}
            onClick={() => menuOpen ? closeMenu() : openMenu()}
          >
            <span aria-hidden="true">☰</span>
          </button>
        </header>

        {activeView === 'calendar' ? (
          <>
            <section className="outdoor-calendar-section" aria-labelledby={monthLabelId}>
              <button
                id={monthLabelId}
                type="button"
                className="outdoor-month-picker-trigger"
                aria-label={t('tools.outdoorTracker.monthPicker.open', { month: monthName })}
                onClick={openMonthPicker}
              >
                {monthName}
              </button>
              <div
                className="outdoor-calendar-wrap"
                onTouchStart={onCalendarTouchStart}
                onTouchMove={onCalendarTouchMove}
                onTouchEnd={onCalendarTouchEnd}
                onTouchCancel={() => { touchStartRef.current = null }}
              >
                <table className={`outdoor-calendar${monthAnimation ? ` outdoor-calendar--${monthAnimation}` : ''}`}>
                  <caption className="visually-hidden">{t('tools.outdoorTracker.calendar.caption', { month: monthName })}</caption>
                  <thead>
                    <tr>
                      {weekdays.map((weekday, index) => (
                        <th key={`${weekday}-${index}`} scope="col">{weekday}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.ceil(((new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7 + monthDays) / 7) }, (_, row) => (
                      <tr key={row}>
                        {Array.from({ length: 7 }, (_, column) => {
                          const leadingDays = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7
                          const day = row * 7 + column - leadingDays + 1
                          if (day < 1 || day > monthDays) return <td key={column} aria-hidden="true" />
                          const key = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${day}`
                          const entry = normalizeEntry(data[key])
                          const value = hasMinutes(entry) ? entry.minutes : null
                          const beforeStart = isBeforeStart(key, trackingStart)
                          const classes = [
                            'outdoor-day',
                            value === null ? '' : value < 30 ? 'outdoor-day--red' : value < 60 ? 'outdoor-day--yellow' : value < 90 ? 'outdoor-day--lightgreen' : 'outdoor-day--darkgreen',
                            key === todayKey ? 'outdoor-day--today' : '',
                            beforeStart ? 'outdoor-day--pre-start' : '',
                          ].filter(Boolean).join(' ')
                          const dayLabel = beforeStart
                            ? t('tools.outdoorTracker.calendar.dayBeforeStart', { day })
                            : value === null
                              ? t('tools.outdoorTracker.calendar.dayEmpty', { date: localizeDateKey(key, locale) })
                              : t('tools.outdoorTracker.calendar.dayWithMinutes', {
                                date: localizeDateKey(key, locale),
                                minutes: localizedNumber(value, locale),
                                hasNote: entry.note ? t('tools.outdoorTracker.calendar.noteAdded') : '',
                              })
                          return (
                            <td key={column}>
                              <button
                                type="button"
                                className={classes}
                                aria-label={dayLabel}
                                aria-current={key === todayKey ? 'date' : undefined}
                                disabled={beforeStart}
                                onClick={() => openEntry(key)}
                              >
                                <span>{day}</span>
                                {value !== null ? <span className="outdoor-day-minutes">{localizedNumber(value, locale)}</span> : null}
                                {entry.note ? <span className="outdoor-day-note" aria-hidden="true">●</span> : null}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="outdoor-calendar-legend" aria-label={t('tools.outdoorTracker.calendar.legendTitle')}>
                <li><span className="outdoor-legend-swatch outdoor-dot--red" />{t('tools.outdoorTracker.review.legend.short')}</li>
                <li><span className="outdoor-legend-swatch outdoor-dot--yellow" />{t('tools.outdoorTracker.review.legend.low')}</li>
                <li><span className="outdoor-legend-swatch outdoor-dot--lightgreen" />{t('tools.outdoorTracker.review.legend.good')}</li>
                <li><span className="outdoor-legend-swatch outdoor-dot--darkgreen" />{t('tools.outdoorTracker.review.legend.high')}</li>
                {trackingStart ? <li><span className="outdoor-legend-swatch outdoor-dot--empty" />{t('tools.outdoorTracker.calendar.beforeStartLegend')}</li> : null}
              </ul>
              <div className="outdoor-month-navigation" role="group" aria-label={t('tools.outdoorTracker.calendar.navigation')}>
                <button type="button" className="button button-secondary" onClick={() => changeMonth(-1)}>
                  <span aria-hidden="true">‹</span> {t('tools.outdoorTracker.calendar.previousMonth')}
                </button>
                <button type="button" className="button button-secondary" onClick={() => changeMonth(1)}>
                  {t('tools.outdoorTracker.calendar.nextMonth')} <span aria-hidden="true">›</span>
                </button>
              </div>
            </section>

            <section className="outdoor-averages" aria-label={t('tools.outdoorTracker.averagesHeading')}>
              <p><strong>{t('tools.outdoorTracker.monthAverage')}:</strong> <span>{monthAverageText}</span></p>
              <p><strong>{t('tools.outdoorTracker.yearAverage')}:</strong> <span>{yearAverageText}</span></p>
            </section>

            <section className="outdoor-panel outdoor-chart-panel" aria-labelledby={`${prefix}-month-chart-title`}>
              <div className="outdoor-section-heading">
                <h3 id={`${prefix}-month-chart-title`}>{t('tools.outdoorTracker.chart.monthTitle', { month: monthName })}</h3>
                <button type="button" className="button button-secondary outdoor-small-button" onClick={() => openModal({ type: 'month-chart-download' })}>
                  {t('tools.outdoorTracker.chart.downloadButton')}
                </button>
              </div>
              <div
                className="outdoor-chart-frame"
                onPointerDown={beginChartHold}
                onPointerUp={cancelChartHold}
                onPointerLeave={cancelChartHold}
                onPointerCancel={cancelChartHold}
                onContextMenu={(event) => event.preventDefault()}
              >
                <canvas
                  ref={monthCanvasRef}
                  role="img"
                  aria-label={t('tools.outdoorTracker.chart.monthDescription', { month: monthName })}
                />
                <p className="outdoor-hold-hint">{t('tools.outdoorTracker.chart.holdHint')}</p>
              </div>
            </section>
          </>
        ) : null}

        {activeView === 'year' ? (
          <section className="outdoor-panel outdoor-subview" aria-labelledby={`${prefix}-year-title`}>
            <h3 id={`${prefix}-year-title`}>{t('tools.outdoorTracker.year.title', { year: currentDate.getFullYear() })}</h3>
            <figure className="outdoor-year-chart">
              <canvas
                ref={yearCanvasRef}
                role="img"
                aria-label={t('tools.outdoorTracker.year.chartDescription', { year: currentDate.getFullYear() })}
              />
              <figcaption className="visually-hidden">{t('tools.outdoorTracker.year.chartCaption', { year: currentDate.getFullYear() })}</figcaption>
            </figure>
            <div className="outdoor-action-row">
              <button type="button" className="button button-secondary" onClick={returnToCalendar}>
                <span aria-hidden="true">←</span> {t('tools.outdoorTracker.common.back')}
              </button>
              <button type="button" className="button button-primary" onClick={() => downloadChartImage('year')}>
                {t('tools.outdoorTracker.year.download')}
              </button>
            </div>
          </section>
        ) : null}

        {activeView === 'stats' ? (
          <section className="outdoor-subview" aria-labelledby={`${prefix}-stats-title`}>
            <h3 id={`${prefix}-stats-title`} className="outdoor-subview-title">{t('tools.outdoorTracker.stats.title')}</h3>
            <div className="outdoor-action-row">
              <button type="button" className="button button-secondary" onClick={returnToCalendar}>
                <span aria-hidden="true">←</span> {t('tools.outdoorTracker.common.back')}
              </button>
              <button type="button" className="button button-primary" onClick={downloadStatsReport}>
                {t('tools.outdoorTracker.stats.download')}
              </button>
            </div>
            <div className="outdoor-stat-grid">
              {formattedAllTimeStats.map((card) => (
                <article className="outdoor-stat-card" key={card.label}>
                  <h4>{card.icon} {card.label}</h4>
                  <p className="outdoor-stat-value">{card.value}</p>
                  {card.details.map((detail, index) => <p className="outdoor-stat-detail" key={`${card.label}-${index}`}>{detail}</p>)}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeView === 'review' ? (
          <section className="outdoor-subview" aria-labelledby={`${prefix}-review-title`}>
            <h3 id={`${prefix}-review-title`} className="outdoor-subview-title">{t('tools.outdoorTracker.review.title')}</h3>
            <div className="outdoor-action-row">
              <button type="button" className="button button-secondary" onClick={returnToCalendar}>
                <span aria-hidden="true">←</span> {t('tools.outdoorTracker.common.back')}
              </button>
              <button type="button" className="button button-primary" onClick={downloadMonthlyReport}>
                {t('tools.outdoorTracker.review.download')}
              </button>
            </div>
            <nav className="outdoor-review-navigation" aria-label={t('tools.outdoorTracker.review.navigation')}>
              <button type="button" className="outdoor-round-button" aria-label={t('tools.outdoorTracker.review.previousMonth')} onClick={() => changeReviewMonth(-1)}>‹</button>
              <span aria-live="polite">{reviewMonthTitle}</span>
              <button type="button" className="outdoor-round-button" aria-label={t('tools.outdoorTracker.review.nextMonth')} onClick={() => changeReviewMonth(1)}>›</button>
            </nav>
            <div className="outdoor-review-hero">
              <p className="outdoor-review-month">🌿 {reviewMonthTitle}</p>
              <p className="outdoor-review-total">{minutesShort(reviewStats.sum, t)}</p>
              <p className="outdoor-review-total-label">{t('tools.outdoorTracker.review.totalOutside')}</p>
              {(previousReviewStats.sum > 0 || reviewStats.sum > 0) ? (
                <p className={`outdoor-comparison ${reviewStats.sum > previousReviewStats.sum ? 'is-positive' : reviewStats.sum < previousReviewStats.sum ? 'is-negative' : 'is-neutral'}`}>
                  {reviewStats.sum > previousReviewStats.sum ? '▲ ' : reviewStats.sum < previousReviewStats.sum ? '▼ ' : '= '}
                  {reviewStats.sum > previousReviewStats.sum ? '+' : ''}{localizedNumber(reviewStats.sum - previousReviewStats.sum, locale)} {t('tools.outdoorTracker.review.minutesAbbreviation')}
                  {previousReviewStats.sum > 0 ? ` (${reviewStats.sum > previousReviewStats.sum ? '+' : ''}${localizedNumber(Math.round(((reviewStats.sum - previousReviewStats.sum) / previousReviewStats.sum) * 100), locale)} %)` : ''}
                  {' '}{t('tools.outdoorTracker.review.comparisonSuffix')}
                </p>
              ) : null}
            </div>
            <div className="outdoor-review-grid">
              {monthStatsCards.map((card) => (
                <article className="outdoor-review-card" key={card.label}>
                  <span className="outdoor-review-card-icon" aria-hidden="true">{card.icon}</span>
                  <h4>{card.label}</h4>
                  <p className="outdoor-stat-value">{card.value}</p>
                  {card.details.filter(Boolean).map((detail, index) => <p className="outdoor-stat-detail" key={`${card.label}-${index}`}>{detail}</p>)}
                </article>
              ))}
            </div>
            <section className="outdoor-panel outdoor-activity" aria-labelledby={`${prefix}-activity-title`}>
              <h4 id={`${prefix}-activity-title`}>{t('tools.outdoorTracker.review.activityHistory')}</h4>
              <div className="outdoor-activity-dots" role="list" aria-label={t('tools.outdoorTracker.review.activityHistory')}>
                {reviewStats.entries.map((entry) => {
                  const label = entry.beforeStart
                    ? t('tools.outdoorTracker.review.beforeStart')
                    : entry.minutes === null || entry.minutes === 0
                      ? t('tools.outdoorTracker.review.zeroMinutes')
                      : t('tools.outdoorTracker.review.minutesValue', { minutes: localizedNumber(entry.minutes, locale) })
                  const color = entry.beforeStart || entry.minutes === null || entry.minutes === 0
                    ? 'outdoor-dot--empty'
                    : entry.minutes < 30 ? 'outdoor-dot--red'
                      : entry.minutes < 60 ? 'outdoor-dot--yellow'
                        : entry.minutes < 90 ? 'outdoor-dot--lightgreen' : 'outdoor-dot--darkgreen'
                  return <span className={`outdoor-activity-dot ${color}`} role="listitem" key={entry.key} aria-label={`${localizeDateKey(entry.key, locale)}: ${label}`} title={`${localizeDateKey(entry.key, locale)}: ${label}`} />
                })}
              </div>
              <ul className="outdoor-legend">
                <li><span className="outdoor-legend-swatch outdoor-dot--darkgreen" />{t('tools.outdoorTracker.review.legend.high')}</li>
                <li><span className="outdoor-legend-swatch outdoor-dot--lightgreen" />{t('tools.outdoorTracker.review.legend.good')}</li>
                <li><span className="outdoor-legend-swatch outdoor-dot--yellow" />{t('tools.outdoorTracker.review.legend.low')}</li>
                <li><span className="outdoor-legend-swatch outdoor-dot--red" />{t('tools.outdoorTracker.review.legend.short')}</li>
              </ul>
            </section>
            <section className="outdoor-review-summary" aria-labelledby={`${prefix}-summary-title`}>
              <h4 id={`${prefix}-summary-title`}>💬 {t('tools.outdoorTracker.review.summaryTitle')}</h4>
              <p>{monthSummary(reviewStats, previousReviewStats, t)}</p>
            </section>
          </section>
        ) : null}

        <input
          ref={importInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label={t('tools.outdoorTracker.menu.import')}
          onChange={readImportFile}
        />

        <p className="outdoor-status" role="status" aria-live="polite">{status}</p>
      </div>

      <aside
        ref={menuRef}
        id={`${prefix}-sidebar`}
        className={`outdoor-sidebar${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${prefix}-menu-title`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="outdoor-sidebar-header">
          <span aria-hidden="true">🌿</span>
          <h3 id={`${prefix}-menu-title`}>{t('tools.outdoorTracker.menu.settings')}</h3>
          <button type="button" className="outdoor-menu-close" aria-label={t('tools.outdoorTracker.menu.close')} onClick={closeMenu}>
            <Icon name="close" />
          </button>
        </div>
        <div className="outdoor-sidebar-content">
          <p className="outdoor-sidebar-section-label">{t('tools.outdoorTracker.menu.view')}</p>
          <button type="button" className="outdoor-sidebar-button" onClick={changeDarkTheme}>
            <span aria-hidden="true">{resolved === 'dark' ? '☀️' : '🌙'}</span>{displayedTheme}
          </button>
          <button type="button" className="outdoor-sidebar-button" aria-pressed={neonMode} onClick={toggleNeonMode}>
            <span aria-hidden="true">🌈</span>{neonMode ? t('tools.outdoorTracker.menu.neonModeOff') : t('tools.outdoorTracker.menu.neonModeOn')}
          </button>
          <button type="button" className="outdoor-sidebar-button" onClick={openYear}>
            <span aria-hidden="true">📈</span>{t('tools.outdoorTracker.menu.yearChart')}
          </button>
          <button type="button" className="outdoor-sidebar-button" onClick={openStats}>
            <span aria-hidden="true">📊</span>{t('tools.outdoorTracker.menu.statistics')}
          </button>
          <button type="button" className="outdoor-sidebar-button" onClick={openReview}>
            <span aria-hidden="true">📋</span>{t('tools.outdoorTracker.menu.monthlyReview')}
          </button>

          <p className="outdoor-sidebar-section-label">{t('tools.outdoorTracker.menu.data')}</p>
          <button type="button" className="outdoor-sidebar-button" onClick={exportJson}><span aria-hidden="true">📤</span>{t('tools.outdoorTracker.menu.exportJson')}</button>
          <button type="button" className="outdoor-sidebar-button" onClick={openImportPicker}><span aria-hidden="true">📥</span>{t('tools.outdoorTracker.menu.import')}</button>
          <button type="button" className="outdoor-sidebar-button" onClick={exportCsv}><span aria-hidden="true">📊</span>{t('tools.outdoorTracker.menu.exportCsv')}</button>
          <button type="button" className="outdoor-sidebar-button" onClick={exportAll}><span aria-hidden="true">💾</span>{t('tools.outdoorTracker.menu.exportAll')}</button>

          <p className="outdoor-sidebar-section-label">{t('tools.outdoorTracker.menu.tracking')}</p>
          <button type="button" className="outdoor-sidebar-button" onClick={openStartDateDialog}>
            <span aria-hidden="true">📅</span>{t('tools.outdoorTracker.menu.startDate')}
            {startDateBadge ? <span className="outdoor-start-date-badge">{startDateBadge}</span> : null}
          </button>

          <p className="outdoor-sidebar-section-label">{t('tools.outdoorTracker.menu.reset')}</p>
          <button type="button" className="outdoor-sidebar-button is-danger" onClick={() => askForConfirmation('reset-month')}>
            <span aria-hidden="true">♻️</span>{t('tools.outdoorTracker.menu.resetMonth')}
          </button>
          <button type="button" className="outdoor-sidebar-button is-danger" onClick={() => askForConfirmation('reset-all')}>
            <span aria-hidden="true">🧹</span>{t('tools.outdoorTracker.menu.resetAll')}
          </button>
        </div>
      </aside>

      {dialog ? (
        <div
          className="outdoor-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            ref={dialogRef}
            className={`outdoor-dialog${dialog.type === 'month-picker' ? ' outdoor-dialog--month-picker' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalHeadingId}
          >
            {dialog.type === 'entry' ? (
              <form onSubmit={saveEntry}>
                <h3 id={modalHeadingId}>{t('tools.outdoorTracker.entry.title', { date: titleDate })}</h3>
                <label htmlFor={entryMinutesId}>{t('tools.outdoorTracker.entry.minutes')}</label>
                <input
                  ref={minutesInputRef}
                  id={entryMinutesId}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={minutesDraft}
                  onChange={(event) => setMinutesDraft(event.target.value)}
                  placeholder={t('tools.outdoorTracker.entry.minutesPlaceholder')}
                />
                <label htmlFor={entryNoteId}>{t('tools.outdoorTracker.entry.note')}</label>
                <textarea
                  id={entryNoteId}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder={t('tools.outdoorTracker.entry.notePlaceholder')}
                  rows={3}
                />
                <div className="outdoor-dialog-actions">
                  <button type="submit" className="button button-primary">{t('tools.outdoorTracker.common.save')}</button>
                  {selectedDate && data[selectedDate] !== undefined ? (
                    <button type="button" className="button button-danger" onClick={deleteEntry}>{t('tools.outdoorTracker.entry.delete')}</button>
                  ) : null}
                  <button type="button" className="button button-secondary" onClick={closeModal}>{t('tools.outdoorTracker.common.cancel')}</button>
                </div>
              </form>
            ) : null}

            {dialog.type === 'month-picker' ? (
              <>
                <h3 id={modalHeadingId}>{t('tools.outdoorTracker.monthPicker.title')}</h3>
                <div className="outdoor-month-picker-year">
                  <button type="button" className="outdoor-round-button" aria-label={t('tools.outdoorTracker.monthPicker.previousYear')} onClick={() => setMonthPickerYear((year) => year - 1)}>‹</button>
                  <span>{monthPickerYear}</span>
                  <button type="button" className="outdoor-round-button" aria-label={t('tools.outdoorTracker.monthPicker.nextYear')} onClick={() => setMonthPickerYear((year) => year + 1)}>›</button>
                </div>
                <div className="outdoor-month-grid">
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(monthPickerYear, monthIndex, 1))
                    const active = monthPickerYear === currentDate.getFullYear() && monthIndex === currentDate.getMonth()
                    return (
                      <button
                        key={monthIndex}
                        type="button"
                        className="outdoor-month-option"
                        aria-label={t('tools.outdoorTracker.monthPicker.selectMonth', { month: localizeMonth(monthPickerYear, monthIndex, locale) })}
                        aria-pressed={active}
                        data-autofocus={active ? 'true' : undefined}
                        onClick={() => selectMonth(monthIndex)}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <div className="outdoor-dialog-actions">
                  <button type="button" className="button button-secondary" onClick={closeModal}>{t('tools.outdoorTracker.common.cancel')}</button>
                </div>
              </>
            ) : null}

            {dialog.type === 'start-date' ? (
              <form onSubmit={saveStartDate}>
                <h3 id={modalHeadingId}>📅 {t('tools.outdoorTracker.startDate.title')}</h3>
                <p className="outdoor-dialog-description">{t('tools.outdoorTracker.startDate.description')}</p>
                <label htmlFor={startDateId}>{t('tools.outdoorTracker.startDate.label')}</label>
                <input
                  ref={startDateInputRef}
                  id={startDateId}
                  type="date"
                  value={startDateDraft}
                  onChange={(event) => setStartDateDraft(event.target.value)}
                />
                <p className="outdoor-current-start-date">
                  {trackingStart
                    ? t('tools.outdoorTracker.startDate.current', { date: startDateBadge })
                    : t('tools.outdoorTracker.startDate.none')}
                </p>
                <div className="outdoor-dialog-actions">
                  <button type="submit" className="button button-primary">{t('tools.outdoorTracker.common.save')}</button>
                  <button type="button" className="button button-danger" onClick={() => askForConfirmation('clear-start')}>{t('tools.outdoorTracker.startDate.reset')}</button>
                  <button type="button" className="button button-secondary" onClick={closeModal}>{t('tools.outdoorTracker.common.cancel')}</button>
                </div>
              </form>
            ) : null}

            {dialog.type === 'month-chart-download' ? (
              <>
                <p className="outdoor-dialog-icon" aria-hidden="true">📊</p>
                <h3 id={modalHeadingId}>{t('tools.outdoorTracker.chart.downloadTitle')}</h3>
                <p className="outdoor-dialog-description">{monthName}</p>
                <div className="outdoor-dialog-actions">
                  <button type="button" className="button button-secondary" onClick={closeModal}>{t('tools.outdoorTracker.common.cancel')}</button>
                  <button type="button" className="button button-primary" onClick={() => downloadChartImage('month')}>{t('tools.outdoorTracker.chart.confirmDownload')}</button>
                </div>
              </>
            ) : null}

            {dialog.type === 'confirm' ? (
              <>
                <h3 id={modalHeadingId}>{confirmationTitle}</h3>
                <p className="outdoor-dialog-description">{confirmationBody}</p>
                <div className="outdoor-dialog-actions">
                  <button type="button" className="button button-secondary" onClick={closeModal}>{t('tools.outdoorTracker.common.cancel')}</button>
                  <button type="button" className="button button-danger" onClick={runConfirmation}>{t('tools.outdoorTracker.common.confirm')}</button>
                </div>
              </>
            ) : null}

            {dialog.type === 'import-confirm' ? (
              <>
                <h3 id={modalHeadingId}>{t('tools.outdoorTracker.import.title')}</h3>
                <p className="outdoor-dialog-description">
                  {t('tools.outdoorTracker.import.confirm', { count: Object.keys(pendingImport?.outdoorData ?? {}).length })}
                </p>
                <div className="outdoor-dialog-actions">
                  <button type="button" className="button button-secondary" onClick={() => { setPendingImport(null); closeModal() }}>{t('tools.outdoorTracker.common.cancel')}</button>
                  <button type="button" className="button button-danger" onClick={confirmImport}>{t('tools.outdoorTracker.common.confirm')}</button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {menuOpen ? <button type="button" className="outdoor-sidebar-dismiss" aria-label={t('tools.outdoorTracker.menu.close')} onClick={closeMenu} /> : null}
      {toast ? <div className="outdoor-toast" role="status">{toast}</div> : null}
    </div>
  )
}
