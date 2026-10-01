import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './i18n'
import { restoreGithubPagesRoute } from './lib/githubPages'
import './styles/app.css'

// GitHub Pages serves 404.html for a direct visit such as /Toolbox/tools/timer.
// That file redirects to /Toolbox/?/tools/timer. Restore the real path before
// BrowserRouter reads window.location. Do not move this below the first render.
restoreGithubPagesRoute()

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root is missing')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
