import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { usePageTitle } from '../components/usePageTitle'
import { toolModules } from '../tools/modules'
import { getTool } from '../tools/registry'
import { NotFoundPage } from './NotFoundPage'

export function ToolPage() {
  const { t } = useTranslation()
  const { toolId } = useParams()
  const tool = getTool(toolId)
  const Tool = tool ? toolModules[tool.id] : undefined
  usePageTitle(tool ? t(tool.nameKey) : t('states.notFoundTitle'))

  if (!tool || tool.status !== 'available' || !Tool) return <NotFoundPage />

  return (
    <article className="narrow-page">
      <p className="back-link">
        <Link to="/">{t('nav.allTools')}</Link>
      </p>
      <header className="page-intro">
        <h1>{t(tool.nameKey)}</h1>
        <p>{t(tool.descriptionKey)}</p>
      </header>
      <ErrorBoundary key={tool.id}>
        <Suspense fallback={<p className="status-line" role="status">{t('states.loading')}</p>}>
          <Tool />
        </Suspense>
      </ErrorBoundary>
    </article>
  )
}
