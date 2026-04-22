import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/App'

describe('App (popup)', () => {
  it('renders the extension shell', async () => {
    render(<App />)

    expect(await screen.findByText('Catalog')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search roles...')).toBeInTheDocument()
  })

  it('renders search results when typing', async () => {
    render(<App />)

    const input = await screen.findByPlaceholderText('Search roles...')
    fireEvent.change(input, { target: { value: 'admin' } })

    const adminResults = await screen.findAllByText('Admin')
    expect(adminResults.length).toBeGreaterThan(0)
  })

  it('shows pinned targets with path context', async () => {
    render(<App />)

    const pinned = await screen.findByText('Pinned')
    const section = pinned.closest('section') as HTMLElement
    expect(within(section).getByText('Admin')).toBeInTheDocument()
  })

  it('has a settings button to open the options page', async () => {
    render(<App />)

    const settingsButton = await screen.findByTitle('Settings')
    expect(settingsButton).toBeInTheDocument()
  })
})
