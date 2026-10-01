import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { ThemeProvider } from '../theme/ThemeProvider'
import { ToolPage } from './ToolPage'

function renderTool(path: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/tools/:toolId" element={<ToolPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>,
  )
}

describe('ToolPage', () => {
  it('renders a working tool and rejects unknown ids', async () => {
    const user = userEvent.setup()
    renderTool('/tools/random-number')
    expect(await screen.findByRole('heading', { name: 'Zufallszahl' })).toBeInTheDocument()

    const min = await screen.findByRole('textbox', { name: 'Minimum' })
    const max = screen.getByRole('textbox', { name: 'Maximum' })
    await user.clear(min)
    await user.clear(max)
    await user.click(screen.getByRole('button', { name: 'Zahl erzeugen' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte Minimum und Maximum eingeben.')

    await user.type(min, '4')
    await user.type(max, '4')
    await user.click(screen.getByRole('button', { name: 'Zahl erzeugen' }))
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders the outdoor tracker at its registered route', async () => {
    renderTool('/tools/outdoor-tracker')
    expect(await screen.findByRole('heading', { name: 'Draußen-Zeit-Tracker' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: /Kalender für/ })).toBeInTheDocument()
  })

  it('shows a translated not-found state', async () => {
    renderTool('/tools/draussen-tracker')
    expect(await screen.findByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })
})
