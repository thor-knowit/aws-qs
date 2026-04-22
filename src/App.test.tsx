import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/App'

describe('App (popup)', () => {
  it('renders the extension shell', async () => {
    render(<App />)

    expect(await screen.findByText('AWS Quick Switch')).toBeInTheDocument()
    expect(screen.getByText('Browse Catalog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search customer, account, alias, role...')).toBeInTheDocument()
  })

  it('renders search results ranked by target when typing', async () => {
    render(<App />)

    const input = await screen.findByPlaceholderText('Search customer, account, alias, role...')
    fireEvent.change(input, { target: { value: 'admin' } })

    const matchesMeta = await screen.findByText(/matches/i)
    expect(matchesMeta).toBeInTheDocument()
    const adminResults = screen.getAllByText('Admin')
    expect(adminResults.length).toBeGreaterThan(0)
  })

  it('shows favorites with path context', async () => {
    render(<App />)

    const favorites = await screen.findByText('Favorites')
    const section = favorites.closest('section') as HTMLElement
    expect(within(section).getByText(/Acme Corp \/ Production \/ Admin/)).toBeInTheDocument()
  })

  it('has an "Edit Catalog" button to open the options page', async () => {
    render(<App />)

    const editButton = await screen.findByText('Edit Catalog')
    expect(editButton).toBeInTheDocument()
  })
})
