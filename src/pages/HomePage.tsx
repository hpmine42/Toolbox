import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../components/icons'
import { ToolGrid } from '../components/ToolCard'
import { usePageTitle } from '../components/usePageTitle'
import i18n from '../i18n'
import { supportedLanguages } from '../i18n/language'
import { matchesQuery, toolHaystack } from '../tools/search'
import { tools } from '../tools/registry'
import { toolCategories, type ToolCategory } from '../tools/types'

const languageCodes = supportedLanguages.map((language) => language.code)
type CategoryFilter = 'all' | ToolCategory

function readTranslation(key: string, language: string): string {
  const value = i18n.getResource(language, 'translation', key)
  return typeof value === 'string' ? value : ''
}

export function HomePage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  usePageTitle()

  const filtered = useMemo(
    () =>
      tools.filter((tool) => {
        if (tool.status !== 'available') return false
        if (category !== 'all' && tool.category !== category) return false
        const haystack = toolHaystack(tool, readTranslation, languageCodes)
        return matchesQuery(haystack, query)
      }),
    [category, query],
  )
  const queryActive = query.trim() !== ''
  const showGroups = category === 'all' && !queryActive

  return (
    <div className="home">
      <header className="page-intro">
        <h1>{t('meta.title')}</h1>
        <p>{t('home.description')}</p>
      </header>
      <form className="search-form" role="search" aria-label={t('home.searchLabel')} onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="tool-search">{t('home.searchLabel')}</label>
        <div className="search-control">
          <Icon name="search" />
          <input
            id="tool-search"
            type="search"
            value={query}
            placeholder={t('home.searchPlaceholder')}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button type="button" className="search-clear" onClick={() => setQuery('')}>
              <Icon name="close" />
              <span className="visually-hidden">{t('home.clearSearch')}</span>
            </button>
          ) : null}
        </div>
      </form>
      <div className="category-row" role="group" aria-label={t('home.categoriesLabel')}>
        <button type="button" className="category-button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
          {t('categories.all')}
        </button>
        {toolCategories.map((item) => (
          <button
            key={item}
            type="button"
            className="category-button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {t(`categories.${item}`)}
          </button>
        ))}
      </div>
      <p className="result-count" aria-live="polite">
        {t('home.resultCount', { count: filtered.length })}
      </p>
      {filtered.length === 0 ? (
        <div className="state-panel">
          <h2>{queryActive ? t('home.resultsTitle') : t('home.emptyTitle')}</h2>
          <p>{t('home.emptyBody')}</p>
        </div>
      ) : showGroups ? (
        toolCategories.map((item) => {
          const group = filtered.filter((tool) => tool.category === item)
          if (group.length === 0) return null
          return (
            <section key={item} className="tool-section" aria-labelledby={`category-${item}`}>
              <h2 id={`category-${item}`}>{t(`categories.${item}`)}</h2>
              <ToolGrid tools={group} showCategory={false} />
            </section>
          )
        })
      ) : (
        <section className="tool-section" aria-labelledby="result-heading">
          <h2 id="result-heading">{queryActive ? t('home.resultsTitle') : t(`categories.${category}`)}</h2>
          <ToolGrid tools={filtered} />
        </section>
      )}
    </div>
  )
}
