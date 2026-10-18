import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { hall1, hall2, listed, reservation, showtime, TZ } from '../test/fixtures'
import { Button, ButtonLink } from './Button'
import { DateStrip } from './DateStrip'
import { Field, TextField } from './Field'
import { GenreChips } from './GenreChips'
import { ListingRow } from './ListingRow'
import { PageState } from './PageState'
import { PosterFrame } from './PosterFrame'
import { Stub } from './Stub'
import { Ticket } from './Ticket'
import { TimeButton } from './TimeButton'

const inRouter = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Button', () => {
  it('is a primary button by default', () => {
    render(<Button onClick={() => {}}>Go</Button>)
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toMatch(/button/)
    expect(button.className).toMatch(/primary/)
  })

  it('takes a variant, size, type and extra class', () => {
    render(
      <Button variant="danger" small type="submit" className="extra">
        Delete
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button.className).toMatch(/danger/)
    expect(button.className).toMatch(/small/)
    expect(button.className).toMatch(/extra/)
  })

  it('can be a link', () => {
    inRouter(
      <>
        <ButtonLink to="/">Home</ButtonLink>
        <ButtonLink to="/bookings" variant="quiet" small className="extra">
          Bookings
        </ButtonLink>
      </>,
    )
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Bookings' }).className).toMatch(/quiet.*small.*extra/)
  })
})

describe('DateStrip', () => {
  const days = ['2026-10-20', '2026-10-21', '2026-10-22']

  it('links each day, marks the selected one and scrolls it into view', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    inRouter(<DateStrip days={days} selected="2026-10-21" hrefFor={(day) => `/?date=${day}`} />)
    const links = within(screen.getByRole('navigation', { name: 'Day' })).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Today', 'Wed 21', 'Thu 22'])
    expect(links[1]).toHaveAttribute('aria-current', 'date')
    expect(links[0]).not.toHaveAttribute('aria-current')
    expect(links[2]).toHaveAttribute('href', '/?date=2026-10-22')
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(links[1])
  })

  it('copes with a selection outside the strip', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    inRouter(<DateStrip days={days} selected="2026-11-01" hrefFor={() => '/'} />)
    expect(scroll).not.toHaveBeenCalled()
  })
})

describe('Field', () => {
  it('labels the control and links the hint and error', () => {
    render(<TextField label="Password" name="password" hint="At least 8 characters." error="Too short" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Too short At least 8 characters.')
  })

  it('has no description without a hint or error', () => {
    render(<TextField label="Email" name="email" />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('renders any control through a render prop', () => {
    render(
      <Field label="Status" hint="Pick one">
        {(control) => (
          <select {...control}>
            <option>Any</option>
          </select>
        )}
      </Field>,
    )
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveAccessibleDescription('Pick one')
  })
})

describe('GenreChips', () => {
  const genres = [
    { id: 1, name: 'Drama' },
    { id: 2, name: 'Sci-Fi' },
  ]

  it('toggles a genre filter', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<GenreChips genres={genres} selected={undefined} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Drama' }))
    expect(onChange).toHaveBeenLastCalledWith(1)

    rerender(<GenreChips genres={genres} selected={1} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sci-Fi' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Drama' }))
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })
})

describe('ListingRow', () => {
  it('shows the movie, its details and its times', () => {
    inRouter(<ListingRow movie={listed({}, [showtime(), showtime({ id: 11, startsAt: '2026-10-20T20:00:00Z' })])} timezone={TZ} />)
    expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    expect(screen.getByText('2 h 28 min, Sci-Fi')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Showtimes for Inception' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText('Hall 1')).toBeNull()
  })

  it('names the halls when the movie plays in more than one', () => {
    inRouter(<ListingRow movie={listed({}, [showtime({ hall: hall1 }), showtime({ id: 11, hall: hall2 })])} timezone={TZ} />)
    expect(screen.getByText('Hall 1')).toBeInTheDocument()
    expect(screen.getByText('Hall 2')).toBeInTheDocument()
  })
})

describe('PageState', () => {
  it('shows a spinner while loading, speaking “Loading…” without showing it', () => {
    const { container } = render(<PageState kind="loading" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByText('Loading…')).toHaveClass('visually-hidden')
    expect(container.querySelector('[aria-hidden="true"]')!.className).toMatch(/spinner/)
  })

  it('shows a custom loading message under the spinner', () => {
    render(<PageState kind="loading" message="Opening the box office…" />)
    expect(screen.getByText('Opening the box office…')).not.toHaveClass('visually-hidden')
  })

  it('shows an empty state with an action', () => {
    render(<PageState kind="empty" message="Nothing here." action={<a href="/">Home</a>} />)
    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('describes errors and offers a retry', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <PageState kind="error" error={new ApiError({ status: 404, code: 'NOT_FOUND', message: '' })} onRetry={onRetry} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('That page doesn’t exist, or it was removed.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()

    rerender(<PageState kind="error" error={new Error('x')} action={<span>Extra</span>} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Extra')).toBeInTheDocument()
  })
})

describe('PosterFrame', () => {
  it('shows the poster, and the title when it fails to load', () => {
    const { container } = render(<PosterFrame title="Inception" posterUrl="https://example.com/p.jpg" large />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://example.com/p.jpg')
    expect((container.firstChild as HTMLElement).className).toMatch(/large/)

    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Inception')).toBeInTheDocument()
  })

  it('tries again when the poster URL changes', () => {
    const { container, rerender } = render(<PosterFrame title="Inception" posterUrl="https://example.com/a.jpg" />)
    fireEvent.error(container.querySelector('img')!)
    rerender(<PosterFrame title="Inception" posterUrl="https://example.com/b.jpg" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/b.jpg')
  })

  it('shows the title without a poster', () => {
    const { container } = render(<PosterFrame title="Up" posterUrl={null} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Up')).toBeInTheDocument()
  })
})

describe('Stub', () => {
  it('shows the seat code, optionally sliding in', () => {
    const { container, rerender } = render(<Stub code="B3" />)
    expect(screen.getByText('B3')).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).className).not.toMatch(/slide/)
    rerender(
      <Stub code="B3" slide>
        <span>×</span>
      </Stub>,
    )
    expect((container.firstChild as HTMLElement).className).toMatch(/slide/)
    expect(screen.getByText('×')).toBeInTheDocument()
  })
})

describe('Ticket', () => {
  const booking = reservation({
    showtime: { ...reservation().showtime, startsAt: '2026-10-20T14:00:00.000Z' },
    seats: [
      { id: 6, row: 'C', number: 1, priceCents: 1200 },
      { id: 5, row: 'B', number: 4, priceCents: 1200 },
      { id: 4, row: 'B', number: 3, priceCents: 1200 },
    ],
  })

  it('shows the movie, time, hall, sorted seats and total', () => {
    render(<Ticket reservation={booking} timezone="Asia/Tokyo" />)
    const ticket = screen.getByRole('article', { name: 'Inception' })
    expect(ticket).toHaveTextContent('Tue 20 Oct, 23:00')
    expect(ticket).toHaveTextContent('Hall 1')
    expect(ticket).toHaveTextContent('SeatsB3 B4 C1')
    expect(ticket).toHaveTextContent('$24.00')
    expect(ticket.className).not.toMatch(/dim/)
  })

  it('says “Seat” for one seat, and shows a status dimmed', () => {
    render(<Ticket reservation={{ ...booking, seats: [booking.seats[0]] }} timezone={TZ} status="Cancelled" />)
    const ticket = screen.getByRole('article')
    expect(ticket).toHaveTextContent('SeatC1')
    expect(ticket).toHaveTextContent('Cancelled')
    expect(ticket.className).toMatch(/dim/)
  })
})

describe('TimeButton', () => {
  it('links to the seat plan with a spoken summary', () => {
    inRouter(
      <ul>
        <TimeButton showtime={showtime({ startsAt: '2026-10-20T14:00:00Z' })} timezone={TZ} context="Inception" />
      </ul>,
    )
    const link = screen.getByRole('link', { name: 'Inception, 14:00, Hall 1, 38 left' })
    expect(link).toHaveAttribute('href', '/showtimes/10')
    expect(screen.queryByText('Hall 1')).toBeNull()
  })

  it('isn’t a link when sold out, and can name the hall', () => {
    inRouter(
      <ul>
        <TimeButton
          showtime={showtime({ startsAt: '2026-10-20T20:00:00Z', seatsAvailable: 0, hall: hall2 })}
          timezone={TZ}
          context="Today"
          showHall
        />
      </ul>,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('20:00').closest('[aria-disabled]')).toHaveTextContent('Today, 20:00')
    expect(screen.getByText('Sold out')).toBeInTheDocument()
    expect(screen.getByText('Hall 2')).toBeInTheDocument()
  })
})
