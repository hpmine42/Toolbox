import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/render'
import i18n from '../../i18n'
import OutdoorTrackerTool from './OutdoorTrackerTool'
import { dateKey, dateInputValue } from './tracker'

function todayLabel(language = 'de') {
  return new Intl.DateTimeFormat(language, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())
}

describe('OutdoorTrackerTool', () => {
  it('records minutes and a note and keeps them in local storage', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OutdoorTrackerTool />)

    const today = screen.getByRole('button', { name: new RegExp(`${todayLabel()}: noch kein Eintrag`) })
    await user.click(today)
    expect(screen.getByRole('dialog', { name: new RegExp('Eintrag für') })).toBeInTheDocument()

    await user.type(screen.getByRole('spinbutton', { name: 'Minuten draußen' }), '55')
    await user.type(screen.getByRole('textbox', { name: 'Notizen (optional)' }), 'Parkrunde')
    await user.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('button', { name: new RegExp('55 Minuten draußen') })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('outdoorData') ?? '{}')[dateKey(new Date())]).toEqual({
      minutes: 55,
      note: 'Parkrunde',
    })
    expect(screen.getByRole('status')).toHaveTextContent('Eintrag gespeichert.')
  })

  it('closes the entry dialog on Escape and returns focus to the selected day', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OutdoorTrackerTool />)

    const day = screen.getByRole('button', { name: new RegExp(`${todayLabel()}: noch kein Eintrag`) })
    await user.click(day)
    expect(screen.getByRole('spinbutton', { name: 'Minuten draußen' })).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(day).toHaveFocus()
  })

  it('moves focus from the settings menu into its date dialog and restores the menu trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OutdoorTrackerTool />)

    const menuTrigger = screen.getByRole('button', { name: 'Einstellungen öffnen' })
    await user.click(menuTrigger)
    await user.click(screen.getByRole('button', { name: 'Startdatum' }))

    const startDateInput = screen.getByLabelText('Startdatum')
    expect(startDateInput).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(menuTrigger).toHaveFocus()
  })

  it('prevents editing dates before the tracking start date', () => {
    const start = new Date()
    start.setDate(start.getDate() + 1)
    localStorage.setItem('trackingStart', dateInputValue(start))
    renderWithProviders(<OutdoorTrackerTool />)

    const preStartDays = screen.getAllByRole('button', { name: /liegt vor dem Tracking-Startdatum/ })
    expect(preStartDays.length).toBeGreaterThan(0)
    expect(preStartDays[0]).toBeDisabled()
  })

  it('uses Toolbox theme state for the tracker dark-mode control', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OutdoorTrackerTool />)
    await user.click(screen.getByRole('button', { name: 'Einstellungen öffnen' }))
    await user.click(screen.getByRole('button', { name: 'Dunklen Modus aktivieren' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('toolbox.theme')).toBe('dark')
  })

  it('localizes the calendar and its accessible controls in English', async () => {
    await i18n.changeLanguage('en')
    renderWithProviders(<OutdoorTrackerTool />)

    expect(screen.getByRole('heading', { name: 'Outdoor time' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Choose a month/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(`${todayLabel('en')}: no entry yet`) })).toBeInTheDocument()
  })

  it('navigates months with buttons and exposes the month picker as a dialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OutdoorTrackerTool />)
    const currentMonth = new Intl.DateTimeFormat('de', { month: 'long', year: 'numeric' }).format(new Date())
    await user.click(screen.getByRole('button', { name: 'Nächster Monat' }))
    const nextMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    const nextMonth = new Intl.DateTimeFormat('de', { month: 'long', year: 'numeric' }).format(nextMonthDate)
    expect(nextMonth).not.toBe(currentMonth)
    expect(screen.getByRole('table', { name: `Kalender für ${nextMonth}` })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: new RegExp('Monat auswählen') }))
    expect(screen.getByRole('dialog', { name: 'Monat auswählen' })).toBeInTheDocument()
    const monthOption = screen.getByRole('button', { name: `${nextMonth} auswählen` })
    expect(monthOption).toHaveAttribute('aria-pressed', 'true')
  })

  it('supports horizontal touch swipes to change months', () => {
    renderWithProviders(<OutdoorTrackerTool />)
    const table = screen.getByRole('table')
    const calendar = table.parentElement
    expect(calendar).not.toBeNull()

    fireEvent.touchStart(calendar!, { changedTouches: [{ screenX: 240, screenY: 120 }] })
    fireEvent.touchMove(calendar!, { changedTouches: [{ screenX: 220, screenY: 122 }] })
    fireEvent.touchEnd(calendar!, { changedTouches: [{ screenX: 150, screenY: 124 }] })

    const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    const label = new Intl.DateTimeFormat('de', { month: 'long', year: 'numeric' }).format(nextMonth)
    expect(screen.getByRole('table', { name: `Kalender für ${label}` })).toBeInTheDocument()
  })

  it('keeps pre-start entries out of the averages', () => {
    const today = new Date()
    const key = dateKey(today)
    const start = new Date(today)
    start.setDate(start.getDate() + 1)
    localStorage.setItem('trackingStart', dateInputValue(start))
    localStorage.setItem('outdoorData', JSON.stringify({ [key]: { minutes: 90, note: '' } }))
    renderWithProviders(<OutdoorTrackerTool />)

    expect(screen.getByText('Monatsdurchschnitt:').parentElement).toHaveTextContent('–')
    expect(screen.getByText('Jahresdurchschnitt:').parentElement).toHaveTextContent('–')
  })
})
