import { useId, type ReactNode } from 'react'

export function TextField({
  id,
  label,
  value,
  onChange,
  describedBy,
  invalid = false,
  inputMode = 'text',
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  describedBy?: string
  invalid?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal'
  disabled?: boolean
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        inputMode={inputMode}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  )
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="field-error" role="alert">
      {children}
    </p>
  )
}

export function ChoiceList({
  legend,
  hint,
  name,
  value,
  options,
  onChange,
  columns = 1,
}: {
  legend: string
  hint?: string
  name: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  columns?: 1 | 3
}) {
  const hintId = useId()
  return (
    <fieldset className={columns === 3 ? 'choice-grid' : 'choice-list'}>
      <legend>{legend}</legend>
      {hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
      <div className="choice-options">
        {options.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              aria-describedby={hint ? hintId : undefined}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
