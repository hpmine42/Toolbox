import { describe, expect, it } from 'vitest'
import { createTimer, formatRemaining, parseDuration, pauseTimer, resetTimer, startTimer, syncTimer } from './timer'

describe('parseDuration', () => {
  it('treats a blank field as zero and converts to milliseconds', () => {
    expect(parseDuration('1', '30')).toEqual({ ok: true, ms: 90_000 })
    expect(parseDuration('', '5')).toEqual({ ok: true, ms: 5_000 })
  })

  it('rejects empty, invalid, and out-of-range values', () => {
    expect(parseDuration('', '')).toEqual({ ok: false, error: 'empty' })
    expect(parseDuration('0', '0')).toEqual({ ok: false, error: 'empty' })
    expect(parseDuration('1.5', '0')).toEqual({ ok: false, error: 'invalid' })
    expect(parseDuration('1', '60')).toEqual({ ok: false, error: 'seconds' })
    expect(parseDuration('1000', '0')).toEqual({ ok: false, error: 'minutes' })
  })
})

describe('timer state', () => {
  it('starts, pauses, resumes, and resets from timestamps', () => {
    const idle = createTimer(60_000)
    const running = startTimer(idle, 1_000)
    expect(running.phase).toBe('running')
    expect(running.endsAt).toBe(61_000)

    const paused = pauseTimer(syncTimer(running, 16_000), 16_000)
    expect(paused.phase).toBe('paused')
    expect(paused.remainingMs).toBe(45_000)

    const resumed = startTimer(paused, 20_000)
    expect(resumed.endsAt).toBe(65_000)
    expect(resetTimer(resumed)).toEqual(idle)
  })

  it('finishes when the end time is reached', () => {
    const running = startTimer(createTimer(5_000), 0)
    expect(syncTimer(running, 5_000).phase).toBe('done')
    expect(pauseTimer(running, 5_000).phase).toBe('done')
    expect(startTimer(syncTimer(running, 5_000), 9_000).phase).toBe('running')
  })
})

describe('formatRemaining', () => {
  it('rounds up to the next visible second and pads the clock', () => {
    expect(formatRemaining(60_000).clock).toBe('01:00')
    expect(formatRemaining(59_001).clock).toBe('01:00')
    expect(formatRemaining(1).clock).toBe('00:01')
    expect(formatRemaining(0).clock).toBe('00:00')
  })
})
