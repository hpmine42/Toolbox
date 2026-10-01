import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../components/usePageTitle'

export function NotFoundPage() {
  const { t } = useTranslation()
  usePageTitle(t('states.notFoundTitle'))

  return (
    <div className="state-panel">
      <h1>{t('states.notFoundTitle')}</h1>
      <p>{t('states.notFoundBody')}</p>
      <Link className="button button-primary" to="/">
        {t('nav.allTools')}
      </Link>
    </div>
  )
}
