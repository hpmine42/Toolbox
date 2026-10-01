import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FieldError, TextField } from '../../components/fields'
import { formatNumber } from '../../lib/format'
import { randomIntInclusive, validateRandomRange } from './randomInt'

export default function RandomNumberTool() {
  const { t, i18n } = useTranslation()
  const minId = useId()
  const maxId = useId()
  const errorId = useId()
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = validateRandomRange(min, max)
    if (!parsed.ok) {
      setResult(null)
      setError(t(`tools.randomNumber.errors.${parsed.error}`))
      return
    }
    setError(null)
    setResult(randomIntInclusive(parsed.min, parsed.max))
  }

  return (
    <form className="tool-panel" onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <TextField
          id={minId}
          label={t('tools.randomNumber.min')}
          value={min}
          onChange={setMin}
          inputMode="numeric"
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
        <TextField
          id={maxId}
          label={t('tools.randomNumber.max')}
          value={max}
          onChange={setMax}
          inputMode="numeric"
          invalid={Boolean(error)}
          describedBy={error ? errorId : undefined}
        />
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      <button type="submit" className="button button-primary">
        {t('tools.randomNumber.generate')}
      </button>
      <div className="result-block">
        <p className="result-label" id={`${minId}-result`}>
          {t('tools.randomNumber.resultLabel')}
        </p>
        <output className="result-value" htmlFor={`${minId} ${maxId}`} aria-live="polite">
          {result === null ? (
            <span className="result-empty">{t('tools.randomNumber.empty')}</span>
          ) : (
            <>
              <span className="visually-hidden">{t('tools.randomNumber.resultLabel')}: </span>
              {formatNumber(result, i18n.language)}
            </>
          )}
        </output>
      </div>
    </form>
  )
}
