import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChoiceList } from '../components/fields'
import { usePageTitle } from '../components/usePageTitle'
import { setAppLanguage } from '../i18n'
import { matchSupportedLanguage, supportedLanguages } from '../i18n/language'
import { useTheme } from '../theme/ThemeProvider'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { preference, setPreference } = useTheme()
  usePageTitle(t('settings.title'))
  const language = matchSupportedLanguage(i18n.resolvedLanguage) ?? 'de'

  return (
    <article className="narrow-page">
      <p className="back-link">
        <Link to="/">{t('nav.allTools')}</Link>
      </p>
      <header className="page-intro">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.intro')}</p>
      </header>
      <div className="tool-panel settings-panel">
        <ChoiceList
          legend={t('settings.language')}
          hint={t('settings.languageHint')}
          name="language"
          value={language}
          onChange={(value) => {
            const selected = matchSupportedLanguage(value)
            if (selected) setAppLanguage(selected)
          }}
          options={supportedLanguages.map((item) => ({ value: item.code, label: t(item.labelKey) }))}
        />
        <ChoiceList
          legend={t('settings.theme')}
          hint={t('settings.themeHint')}
          name="theme"
          value={preference}
          onChange={(value) => {
            if (value === 'system' || value === 'light' || value === 'dark') setPreference(value)
          }}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
        <p className="hint privacy-note">{t('settings.privacy')}</p>
      </div>
    </article>
  )
}
