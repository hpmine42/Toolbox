import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function usePageTitle(pageTitle?: string): void {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const appName = t('meta.title')
    document.title = pageTitle ? `${pageTitle} · ${appName}` : appName
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'))
  }, [i18n.language, pageTitle, t])
}
