import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/render'
import UnitConverterTool from './UnitConverterTool'

describe('UnitConverterTool', () => {
  it('converts a value and reports invalid input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UnitConverterTool />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Von' }), 'km')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nach' }), 'm')
    await user.type(screen.getByRole('textbox', { name: 'Wert' }), '1,5')
    expect(screen.getByText('1,5 km = 1.500 m')).toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Wert' }))
    await user.type(screen.getByRole('textbox', { name: 'Wert' }), 'abc')
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte eine gültige Zahl eingeben.')
  })
})
