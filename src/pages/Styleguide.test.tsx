import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../test/render'
import { StyleguidePage } from './Styleguide'

describe('StyleguidePage', () => {
  it('shows the palette and both lighting states', () => {
    renderPage(<StyleguidePage />, { path: '/styleguide' })
    expect(document.title).toBe('Style guide')
    expect(screen.getByText('Screen silver')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'House lights up' })).toHaveAttribute('data-lights', 'up')
    expect(screen.getByRole('region', { name: 'House lights down' })).toHaveAttribute('data-lights', 'down')
  })

  it('has a working seat plan with the lights down only', async () => {
    const view = renderPage(<StyleguidePage />, { path: '/styleguide' })
    expect(within(screen.getByRole('region', { name: 'House lights up' })).queryByRole('group', { name: 'Seats' })).toBeNull()

    const down = screen.getByRole('region', { name: 'House lights down' })
    const b3 = within(down).getByRole('button', { name: 'Row B, seat 3, available' })
    expect(b3).toHaveAttribute('aria-pressed', 'true')
    await view.user.click(b3)
    expect(b3).toHaveAttribute('aria-pressed', 'false')
    await view.user.click(b3)
    expect(b3).toHaveAttribute('aria-pressed', 'true')
  })

  it('has inert sample buttons', async () => {
    const view = renderPage(<StyleguidePage />, { path: '/styleguide' })
    const up = screen.getByRole('region', { name: 'House lights up' })
    await view.user.click(within(up).getByRole('button', { name: 'Dismiss' }))
    await view.user.click(within(up).getByRole('button', { name: 'Try again' }))
    const down = screen.getByRole('region', { name: 'House lights down' })
    // Taken seats can't be clicked; the sample has no limit to hit.
    expect(within(down).getAllByRole('button', { name: /taken/ })[0]).toBeDisabled()
    expect(within(up).getByText('Booked. See you on Tue 20 at 14:00.')).toBeInTheDocument()
  })
})
