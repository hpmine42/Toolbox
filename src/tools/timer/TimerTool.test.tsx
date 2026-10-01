import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/render'
import TimerTool from './TimerTool'

describe('TimerTool', () => {
  it('starts, pauses, and resets', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TimerTool />)

    expect(screen.getByRole('timer')).toHaveTextContent('01:00')
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('status')).toHaveTextContent('Timer läuft.')
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('status')).toHaveTextContent('Timer pausiert.')
    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    expect(screen.getByRole('timer')).toHaveTextContent('01:00')
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  it('rejects an empty duration', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TimerTool />)
    await user.clear(screen.getByRole('textbox', { name: 'Minuten' }))
    await user.clear(screen.getByRole('textbox', { name: 'Sekunden' }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte eine Dauer größer als null eingeben.')
  })
})