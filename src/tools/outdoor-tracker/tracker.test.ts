import { describe, expect, it } from 'vitest'
import {
  buildCsv,
  dateFromKey,
  dateInputValue,
  dateKey,
  dateKeyFromInput,
  encodeUtf16Le,
  getAllDaysInData,
  getAllTimeStats,
  getMonthChartValues,
  getMonthStats,
  getPeriodAverages,
  getYearChartValues,
  isBeforeStart,
  normalizeEntry,
  parseOutdoorBackup,
  parseOutdoorData,
  serializeBackup,
  type OutdoorData,
} from './tracker'

const localDate = (year: number, month: number, day: number) => new Date(year, month - 1, day)

describe('outdoor tracker data utilities', () => {
  it('parses and formats the legacy local date keys without timezone shifts', () => {
    const date = dateFromKey('2024-2-29')
    expect(date && dateKey(date)).toBe('2024-2-29')
    expect(dateInputValue(date!)).toBe('2024-02-29')
    expect(dateKeyFromInput('2024-02-29')?.getDate()).toBe(29)
    expect(dateFromKey('2024-2-30')).toBeNull()
    expect(dateKeyFromInput('2023-02-29')).toBeNull()
  })

  it('loads both numeric legacy entries and the newer note object shape', () => {
    expect(normalizeEntry(42)).toEqual({ minutes: 42, note: '' })
    expect(normalizeEntry({ minutes: '18', note: 'Walk' })).toEqual({ minutes: 18, note: 'Walk' })
    expect(parseOutdoorData('{"2024-1-1":12,"not-a-date":4,"2024-1-2":{"minutes":30,"note":"Park"},"2024-01-03":18}')).toEqual({
      '2024-1-1': { minutes: 12, note: '' },
      '2024-1-2': { minutes: 30, note: 'Park' },
      '2024-1-3': { minutes: 18, note: '' },
    })
    expect(parseOutdoorData('{broken')).toEqual({})
  })

  it('excludes days before the configured tracking start from averages and month details', () => {
    const data: OutdoorData = {
      '2024-1-1': { minutes: 120, note: '' },
      '2024-1-2': { minutes: 90, note: '' },
      '2024-1-3': { minutes: 0, note: '' },
    }
    const start = localDate(2024, 1, 2)
    expect(isBeforeStart('2024-1-1', start)).toBe(true)
    expect(isBeforeStart('2024-1-2', start)).toBe(false)
    expect(getPeriodAverages(data, 2024, 0, start)).toEqual({ month: 45, year: 45 })
    const stats = getMonthStats(2024, 1, data, start)
    expect(stats.entries[0]).toMatchObject({ minutes: null, beforeStart: true })
    expect(stats.sum).toBe(90)
    expect(stats.trackedDays).toBe(1)
    expect(stats.averagePerCalendarDay).toBe(3)
  })

  it('summarizes totals, positive-day streaks, and best/worst months', () => {
    const data: OutdoorData = {
      '2024-1-1': { minutes: 60, note: '' },
      '2024-1-2': { minutes: 90, note: '' },
      '2024-1-3': { minutes: 0, note: '' },
      '2024-2-1': { minutes: 80, note: '' },
      '2024-2-2': { minutes: 120, note: '' },
    }
    const start = localDate(2024, 1, 2)
    const stats = getAllTimeStats(data, start, localDate(2024, 2, 2))
    expect(stats.totalMinutes).toBe(290)
    expect(stats.recordedDays).toBe(4)
    expect(stats.longestStreak).toBe(2)
    expect(stats.longestStreakEnd).toBe('2024-2-2')
    expect(stats.currentStreak).toBe(2)
    expect(stats.bestMonth).toMatchObject({ year: 2024, month: 2, average: 100 })
    expect(stats.worstMonth).toMatchObject({ year: 2024, month: 1, average: 45 })
    expect(stats.mostMinutesMonth).toMatchObject({ year: 2024, month: 2, total: 200 })
  })

  it('fills missing days for export, skips dates before start, and writes a UTF-16LE BOM', () => {
    const data: OutdoorData = { '2024-1-2': { minutes: 25, note: 'A "fresh" walk; by the river' } }
    const start = localDate(2024, 1, 2)
    const today = localDate(2024, 1, 3)
    expect(Object.keys(getAllDaysInData(data, start, today))).toEqual(['2024-1-2', '2024-1-3'])
    expect(buildCsv(data, start, today, 'Date;Minutes;Notes')).toBe(
      'Date;Minutes;Notes\n2024-1-2;25;"A ""fresh"" walk; by the river"\n2024-1-3;0;""\n',
    )
    const buffer = encodeUtf16Le('A')
    const bytes = new Uint8Array(buffer)
    expect([...bytes]).toEqual([0xff, 0xfe, 0x41, 0x00])
  })

  it('builds month and leap-year chart data while masking pre-start days', () => {
    const data: OutdoorData = { '2024-1-2': { minutes: 35, note: '' } }
    const start = localDate(2024, 1, 2)
    const january = getMonthChartValues(2024, 0, data, start)
    expect(january).toHaveLength(31)
    expect(january.slice(0, 3)).toEqual([null, 35, 0])
    expect(getYearChartValues(2024, data, start).values).toHaveLength(366)
  })

  it('imports supported backups safely and ignores malformed and future dates', () => {
    const backup = parseOutdoorBackup({
      outdoorData: {
        '2024-1-1': 20,
        '2024-1-2': { minutes: 45, note: 'Outside' },
        '2024-1-3': 90,
        malformed: 3,
      },
      trackingStart: '2024-01-02',
      darkMode: 'true',
      neonMode: 'false',
    }, localDate(2024, 1, 2))
    expect(backup).toEqual({
      outdoorData: {
        '2024-1-1': { minutes: 20, note: '' },
        '2024-1-2': { minutes: 45, note: 'Outside' },
      },
      trackingStart: '2024-01-02',
      darkMode: 'true',
      neonMode: 'false',
    })
    expect(parseOutdoorBackup({ outdoorData: [] }, localDate(2024, 1, 2))).toBeNull()
  })

  it('exports a compatible backup with the current start date and view settings', () => {
    expect(serializeBackup(
      { '2024-1-1': { minutes: 15, note: '' } },
      localDate(2024, 1, 1),
      true,
      false,
      localDate(2024, 1, 1),
    )).toEqual({
      outdoorData: { '2024-1-1': { minutes: 15, note: '' } },
      trackingStart: '2024-01-01',
      darkMode: 'true',
      neonMode: 'false',
    })
  })
})
