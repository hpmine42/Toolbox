import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import i18n from '../i18n'
import { LANGUAGE_STORAGE_KEY } from '../lib/storage'
import { matchSupportedLanguage } from '../i18n/language'
import { useTheme } from '../theme/ThemeProvider'
import { Icon } from './icons'

export function AppLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { resolved, setPreference } = useTheme()
  const themeLabel = resolved === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) return
      const language = matchSupportedLanguage(event.newValue)
      if (language) void i18n.changeLanguage(language)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <header className="site-header">
        <div className="shell header-bar">
          <NavLink to="/" end className="brand">
            <Icon name="toolbox" />
            <span>{t('meta.title')}</span>
            <span className="visually-hidden">{t('nav.home')}</span>
          </NavLink>
          <nav className="header-actions" aria-label={t('nav.primary')}>
            <button
              type="button"
              className="header-action"
              onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
            >
              <Icon name={resolved === 'dark' ? 'sun' : 'moon'} />
              <span className="header-label">{themeLabel}</span>
            </button>
            <NavLink to="/settings" className="header-action">
              <Icon name="settings" />
              <span className="header-label">{t('nav.settings')}</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" className="shell">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="shell">
          <p>{t('footer.note')}</p>
        </div>
      </footer>
    </div>
  )
}
