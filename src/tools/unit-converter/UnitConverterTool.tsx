import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChoiceList, FieldError, SelectField, TextField } from '../../components/fields'
import { Icon } from '../../components/icons'
import { formatNumber } from '../../lib/format'
import { parseDecimal } from '../../lib/parseNumber'
import { convertInput, defaultUnitPair, unitCategories, unitsFor, type UnitCategory } from './units'

export default function UnitConverterTool() {
  const { t, i18n } = useTranslation()
  const valueId = useId()
  const fromId = useId()
  const toId = useId()
  const errorId = useId()
  const [category, setCategory] = useState<UnitCategory>('length')
  const [from, setFrom] = useState(defaultUnitPair.length.from)
  const [to, setTo] = useState(defaultUnitPair.length.to)
  const [rawValue, setRawValue] = useState('')

  function changeCategory(next: string) {
    const selected = unitCategories.find((item) => item === next) ?? 'length'
    setCategory(selected)
    setFrom(defaultUnitPair[selected].from)
    setTo(defaultUnitPair[selected].to)
  }

  const result = convertInput(category, rawValue, from, to)
  const units = unitsFor(category)
  const parsed = parseDecimal(rawValue)
  const equation =
    result.status === 'ok' && parsed !== null
      ? `${formatNumber(parsed, i18n.language)} ${t(`tools.unitConverter.symbols.${from}`)} = ${formatNumber(result.value, i18n.language)} ${t(`tools.unitConverter.symbols.${to}`)}`
      : ''

  return (
    <div className="tool-panel">
      <ChoiceList
        legend={t('tools.unitConverter.category')}
        name="unit-category"
        value={category}
        columns={3}
        onChange={changeCategory}
        options={unitCategories.map((item) => ({
          value: item,
          label: t(`tools.unitConverter.${item}`),
        }))}
      />
      <TextField
        id={valueId}
        label={t('tools.unitConverter.value')}
        value={rawValue}
        onChange={setRawValue}
        inputMode="decimal"
        invalid={result.status === 'error'}
        describedBy={result.status === 'error' ? errorId : undefined}
      />
      <div className="unit-pair">
        <SelectField id={fromId} label={t('tools.unitConverter.from')} value={from} onChange={setFrom}>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {t(`tools.unitConverter.units.${unit}`)}
            </option>
          ))}
        </SelectField>
        <button
          type="button"
          className="button button-secondary icon-button"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
        >
          <Icon name="swap" />
          <span className="visually-hidden">{t('tools.unitConverter.swap')}</span>
        </button>
        <SelectField id={toId} label={t('tools.unitConverter.to')} value={to} onChange={setTo}>
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {t(`tools.unitConverter.units.${unit}`)}
            </option>
          ))}
        </SelectField>
      </div>
      {result.status === 'error' ? (
        <FieldError id={errorId}>{t(`tools.unitConverter.errors.${result.error}`)}</FieldError>
      ) : null}
      <div className="result-block">
        <p className="result-label" id={`${valueId}-result`}>
          {t('tools.unitConverter.result')}
        </p>
        <output className="result-value result-equation" htmlFor={`${valueId} ${fromId} ${toId}`} aria-labelledby={`${valueId}-result`}>
          {equation || <span className="result-empty">{t('tools.unitConverter.empty')}</span>}
        </output>
      </div>
    </div>
  )
}
