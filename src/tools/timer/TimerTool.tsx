import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FieldError, TextField } from '../../components/fields'
import {
  createTimer,
  formatRemaining,
  parseDuration,
  pauseTimer,
  resetTimer,
  startTimer,
  syncTimer,
  type DurationError,
} from './timer'

export default function TimerTool() {
  const { t } = useTranslation()
  const minutesId = useId()
  const secondsId = useId()
  const errorId = useId()
  const [minutes, setMinutes] = useState('1')
  const [seconds, setSeconds] = useState('0')
  const [state, setState] = useState(() => createTimer(60_000))
  const [error, setError] = useState<DurationError | null>(null)
  const parsed = useMemo(() => parseDuration(minutes, seconds), [minutes, seconds])
  const locked = state.phase === 'running' || state.phase === 'paused'
  const clock = formatRemaining(state.remainingMs)

  useEffect(() => {
    if (!parsed.ok) return
    setState((current) => {
      if (current.phase === 'running' || current.phase === 'paused') return current
      if (current.phase === 'idle' && current.durationMs === parsed.ms) return current
      return createTimer(parsed.ms)
    })
  }, [parsed])

  useEffect(() => {
    if (state.phase !== 'running') return
    const tick = () => setState((current) => syncTimer(current, Date.now()))
    const id = window.setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [state.phase])

  function onStart() {
    if (state.phase === 'paused') {
      setError(null)
      setState((current) => startTimer(current, Date.now()))
      return
    }
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(null)
    setState((current) => startTimer(current.phase === 'done' ? createTimer(parsed.ms) : current, Date.now()))
  }

  const status =
    state.phase === 'running'
      ? t('tools.timer.phaseRunning')
      : state.phase === 'paused'
        ? t('tools.timer.phasePaused')
        : state.phase === 'done'
          ? t('tools.timer.done')
          : ''

  return (
    <form
      className="tool-panel"
      data-phase={state.phase}
      onSubmit={(event) => {
        event.preventDefault()
        onStart()
      }}
      noValidate
    >
      <div className="field-row">
        <TextField
          id={minutesId}
          label={t('tools.timer.minutes')}
          value={minutes}
          onChange={(value) => {
            setMinutes(value)
            setError(null)
          }}
          inputMode="numeric"
          disabled={locked}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
        <TextField
          id={secondsId}
          label={t('tools.timer.seconds')}
          value={seconds}
          onChange={(value) => {
            setSeconds(value)
            setError(null)
          }}
          inputMode="numeric"
          disabled={locked}
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
      </div>
      {locked ? <p className="hint">{t('tools.timer.hintLocked')}</p> : null}
      {error ? <FieldError id={errorId}>{t(`tools.timer.errors.${error}`)}</FieldError> : null}
      <div className="result-block">
        <p className="result-label" id={`${minutesId}-remaining`}>
          {t('tools.timer.remaining')}
        </p>
        <p
          className="result-value clock"
          role="timer"
          aria-labelledby={`${minutesId}-remaining`}
          aria-label={t('tools.timer.remainingLabel', {
            minutes: t('tools.timer.minute', { count: clock.minutes }),
            seconds: t('tools.timer.second', { count: clock.seconds }),
          })}
        >
          {clock.clock}
        </p>
      </div>
      <div className="button-row">
        {state.phase === 'running' ? (
          <button type="button" className="button button-primary" onClick={() => setState((current) => pauseTimer(current, Date.now()))}>
            {t('tools.timer.pause')}
          </button>
        ) : (
          <button type="submit" className="button button-primary">
            {state.phase === 'paused' ? t('tools.timer.resume') : t('tools.timer.start')}
          </button>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setError(null)
            setState((current) => resetTimer(current))
          }}
          disabled={state.phase === 'idle'}
        >
          {t('tools.timer.reset')}
        </button>
      </div>
      <p className="status-line" role="status">
        {status}
      </p>
    </form>
  )
}
