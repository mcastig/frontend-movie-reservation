import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderPage } from '../test/render'
import { NotFoundPage } from './NotFound'

describe('NotFoundPage', () => {
  it('says the page isn’t showing and links to today', () => {
    renderPage(<NotFoundPage />, { path: '/nope' })
    expect(screen.getByRole('heading', { name: 'This page isn’t showing' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See what’s on today' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('Not found')
  })
})
