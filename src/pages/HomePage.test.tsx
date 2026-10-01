import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../test/render'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('lists the available tools and filters them', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Toolbox' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zufallszahl' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Timer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Einheiten-Umrechner' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Zeit' }))
    expect(screen.getByRole('link', { name: 'Timer' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Zufallszahl' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Alle' }))
    await user.type(screen.getByRole('searchbox', { name: 'Werkzeuge suchen' }), 'gewicht')
    expect(screen.getByRole('link', { name: 'Einheiten-Umrechner' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Timer' })).not.toBeInTheDocument()
  })
})
