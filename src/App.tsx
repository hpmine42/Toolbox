import { I18nextProvider } from 'react-i18next'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import i18n from './i18n'
import { AppLayout } from './components/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { ToolPage } from './pages/ToolPage'
import { ThemeProvider } from './theme/ThemeProvider'

function routerBasename(baseUrl = import.meta.env.BASE_URL): string | undefined {
  const trimmed = baseUrl.replace(/\/$/, '')
  return trimmed === '' ? undefined : trimmed
}

export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <BrowserRouter basename={routerBasename()}>
          <ErrorBoundary>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="tools/:toolId" element={<ToolPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  )
}
