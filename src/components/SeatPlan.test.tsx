import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SeatPlan as Plan } from '../api/types'
import { SeatPlan } from './SeatPlan'

const seat = (id: number, number: number, available = true) => ({ id, number, available })

// A: 1 2 ✕ 4    B: ✕ ✕ (none free)    C: 1 2 3 4 5
const rows: Plan['rows'] = [
  { row: 'A', seats: [seat(1, 1), seat(2, 2), seat(3, 3, false), seat(4, 4)] },
  { row: 'B', seats: [seat(5, 1, false), seat(6, 2, false)] },
  { row: 'C', seats: [seat(7, 1), seat(8, 2), seat(9, 3), seat(10, 4), seat(11, 5)] },
]

function setup(props: Partial<Parameters<typeof SeatPlan>[0]> = {}) {
  const onToggle = vi.fn()
  const onLimit = vi.fn()
  const view = render(<SeatPlan rows={rows} selected={[]} atLimit={false} onToggle={onToggle} onLimit={onLimit} {...props} />)
  return { ...view, onToggle, onLimit, user: userEvent.setup() }
}

const seatButton = (row: string, number: number) => screen.getByRole('button', { name: new RegExp(`^Row ${row}, seat ${number},`) })

describe('SeatPlan', () => {
  it('labels every seat and marks taken ones', () => {
    setup({ selected: [2] })
    expect(seatButton('A', 1)).toHaveAccessibleName('Row A, seat 1, available')
    expect(seatButton('A', 1)).toHaveAttribute('aria-pressed', 'false')
    expect(seatButton('A', 2)).toHaveAttribute('aria-pressed', 'true')
    const taken = seatButton('A', 3)
    expect(taken).toBeDisabled()
    expect(taken).toHaveTextContent('✕')
    expect(taken).not.toHaveAttribute('aria-pressed')
    expect(screen.getByRole('group', { name: 'Row C' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Key' })).toHaveTextContent('Free Yours✕ Taken')
  })

  it('lifts seats toward the ends of a row, and not at all in a one-seat row', () => {
    setup({ rows: [...rows, { row: 'D', seats: [seat(12, 1)] }] })
    expect(seatButton('C', 3).style.getPropertyValue('--lift')).toBe('0.000rem')
    expect(seatButton('C', 1).style.getPropertyValue('--lift')).toBe('-0.600rem')
    expect(seatButton('D', 1).style.getPropertyValue('--lift')).toBe('0px')
  })

  it('toggles a seat on click', async () => {
    const { user, onToggle } = setup()
    await user.click(seatButton('C', 2))
    expect(onToggle).toHaveBeenCalledWith(rows[2].seats[1], 'C')
  })

  it('refuses more seats at the limit, but still lets picks go', async () => {
    const { user, onToggle, onLimit } = setup({ selected: [1], atLimit: true })
    expect(seatButton('A', 2)).toHaveAttribute('aria-disabled', 'true')
    expect(seatButton('A', 1)).not.toHaveAttribute('aria-disabled')

    await user.click(seatButton('A', 2))
    expect(onLimit).toHaveBeenCalled()
    expect(onToggle).not.toHaveBeenCalled()

    await user.click(seatButton('A', 1))
    expect(onToggle).toHaveBeenCalledWith(rows[0].seats[0], 'A')
  })

  describe('keyboard', () => {
    it('puts the first free seat in the tab order, or the first pick', () => {
      const { rerender, onToggle, onLimit } = setup()
      expect(seatButton('A', 1)).toHaveAttribute('tabindex', '0')
      expect(seatButton('A', 2)).toHaveAttribute('tabindex', '-1')

      rerender(<SeatPlan rows={rows} selected={[9]} atLimit={false} onToggle={onToggle} onLimit={onLimit} />)
      expect(seatButton('C', 3)).toHaveAttribute('tabindex', '0')
    })

    it('moves along the row, skipping taken seats', async () => {
      const { user } = setup()
      await user.tab()
      expect(seatButton('A', 1)).toHaveFocus()
      await user.keyboard('{ArrowRight}')
      expect(seatButton('A', 2)).toHaveFocus()
      await user.keyboard('{ArrowRight}')
      expect(seatButton('A', 4)).toHaveFocus()
      expect(seatButton('A', 4)).toHaveAttribute('tabindex', '0')
      // Past the end: stays put.
      await user.keyboard('{ArrowRight}')
      expect(seatButton('A', 4)).toHaveFocus()
      await user.keyboard('{ArrowLeft}')
      expect(seatButton('A', 2)).toHaveFocus()
      await user.keyboard('{Home}')
      expect(seatButton('A', 1)).toHaveFocus()
      await user.keyboard('{End}')
      expect(seatButton('A', 4)).toHaveFocus()
    })

    it('moves between rows to the nearest free seat, skipping full rows', async () => {
      const { user } = setup()
      seatButton('A', 4).focus()
      await user.keyboard('{ArrowDown}')
      expect(seatButton('C', 4)).toHaveFocus()
      // Nothing below the last row.
      await user.keyboard('{ArrowDown}')
      expect(seatButton('C', 4)).toHaveFocus()
      await user.keyboard('{ArrowRight}{ArrowUp}')
      expect(seatButton('A', 4)).toHaveFocus()
      // Nothing above the first row.
      await user.keyboard('{ArrowUp}')
      expect(seatButton('A', 4)).toHaveFocus()
    })

    it('ignores other keys', async () => {
      const { user, onToggle } = setup()
      seatButton('A', 1).focus()
      await user.keyboard('x')
      expect(seatButton('A', 1)).toHaveFocus()
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('does nothing when every seat is taken', () => {
      const full: Plan['rows'] = [{ row: 'A', seats: [seat(1, 1, false)] }]
      setup({ rows: full })
      fireEvent.keyDown(screen.getByRole('group', { name: 'Seats' }), { key: 'ArrowRight' })
      expect(seatButton('A', 1)).toHaveAttribute('tabindex', '-1')
    })
  })

  it('forgets seats that leave the plan', () => {
    const { rerender, onToggle, onLimit } = setup()
    rerender(<SeatPlan rows={[rows[2]]} selected={[]} atLimit={false} onToggle={onToggle} onLimit={onLimit} />)
    expect(screen.queryByRole('group', { name: 'Row A' })).toBeNull()
    expect(seatButton('C', 1)).toHaveAttribute('tabindex', '0')
  })
})
