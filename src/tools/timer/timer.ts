export type TimerPhase = 'idle' | 'running' | 'paused' | 'done'

export interface TimerState {
  phase: TimerPhase
  durationMs: number
  remainingMs: number
  endsAt: number | null
}

export type DurationError = 'empty' | 'invalid' | 'seconds' | 'minutes'

export type DurationResult = { ok: true; ms: number } | { ok: false; error: DurationError }

const MAX_MINUTES = 999

export function parseDuration(minutesRaw: string, secondsRaw: string): DurationResult {
  if (minutesRaw.trim() === '' && secondsRaw.trim() === '') return { ok: false, error: 'empty' }
  const minutesText = minutesRaw.trim() === '' ? '0' : minutesRaw.trim()
  const secondsText = secondsRaw.trim() === '' ? '0' : secondsRaw.trim()
  if (!/^\d+$/.test(minutesText) || !/^\d+$/.test(secondsText)) return { ok: false, error: 'invalid' }
  const minutes = Number(minutesText)
  const seconds = Number(secondsText)
  if (!Number.isSafeInteger(minutes) || !Number.isSafeInteger(seconds)) return { ok: false, error: 'invalid' }
  if (minutes > MAX_MINUTES) return { ok: false, error: 'minutes' }
  if (seconds > 59) return { ok: false, error: 'seconds' }
  if (minutes * 60 + seconds <= 0) return { ok: false, error: 'empty' }
  return { ok: true, ms: (minutes * 60 + seconds) * 1000 }
}

export function createTimer(durationMs: number): TimerState {
  return { phase: 'idle', durationMs, remainingMs: durationMs, endsAt: null }
}

export function startTimer(state: TimerState, now: number): TimerState {
  if (state.phase === 'running') return state
  const remaining = state.phase === 'done' ? state.durationMs : state.remainingMs
  if (remaining <= 0) return state
  return { ...state, phase: 'running', remainingMs: remaining, endsAt: now + remaining }
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'running' || state.endsAt === null) return state
  const remaining = Math.max(0, state.endsAt - now)
  if (remaining === 0) return { ...state, phase: 'done', remainingMs: 0, endsAt: null }
  return { ...state, phase: 'paused', remainingMs: remaining, endsAt: null }
}

export function resetTimer(state: TimerState): TimerState {
  return createTimer(state.durationMs)
}

export function syncTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'running' || state.endsAt === null) return state
  const remaining = state.endsAt - now
  if (remaining <= 0) return { ...state, phase: 'done', remainingMs: 0, endsAt: null }
  return { ...state, remainingMs: remaining }
}

export function formatRemaining(ms: number): { minutes: number; seconds: number; clock: string } {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return {
    minutes,
    seconds,
    clock: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  }
}
