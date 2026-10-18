import { useState } from 'react'
import { describeError } from '../../api/errors'
import { useAdminBookings, useChangeRole } from '../../api/hooks'
import type { Role } from '../../api/types'
import { useAuth } from '../../auth/context'
import { Button } from '../../components/Button'
import { TextField } from '../../components/Field'
import { PageState } from '../../components/PageState'
import { useToast } from '../../components/toast-context'
import styles from './admin.module.css'

interface Person {
  id: number
  name: string
  email: string
}

// Until the API has GET /users?query= (backend task B3), people are found among
// those who have booked, and anyone else by their user number.
export function AdminUsersPage() {
  const [query, setQuery] = useState('')
  const bookings = useAdminBookings({ page: 1, limit: 100 })
  const { user: me } = useAuth()

  const people = new Map<number, Person>()
  bookings.data?.data.forEach((r) => people.set(r.user.id, r.user))
  const needle = query.trim().toLowerCase()
  const byNumber = /^\d+$/.test(needle) ? Number(needle) : undefined
  const matches = [...people.values()].filter(
    (p) =>
      !needle || p.id === byNumber || p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle),
  )

  return (
    <section className={styles.section} aria-labelledby="users-title">
      <h1 id="users-title" className={styles.title}>
        Users
      </h1>
      <p className={styles.note}>
        Search people who have booked by name or email, or enter a user number. Your own role can’t be changed here.
      </p>
      <TextField
        label="Find a user"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name, email or user number"
      />

      {bookings.isPending ? (
        <PageState kind="loading" />
      ) : bookings.isError ? (
        <PageState kind="error" error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {byNumber !== undefined && !people.has(byNumber) && (
                <UserRow person={{ id: byNumber, name: '—', email: '—' }} isMe={me?.id === byNumber} />
              )}
              {matches.map((p) => (
                <UserRow key={p.id} person={p} isMe={me?.id === p.id} />
              ))}
              {matches.length === 0 && byNumber === undefined && (
                <tr>
                  <td colSpan={4}>No one who has booked matches. Try their user number.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function UserRow({ person, isMe }: { person: Person; isMe: boolean }) {
  const change = useChangeRole()
  const toast = useToast()
  const name = person.name === '—' ? `User ${person.id}` : person.name

  const set = (role: Role) =>
    change.mutate(
      { id: person.id, role },
      {
        onSuccess: (user) =>
          toast({ message: `${user.name} is now ${user.role === 'admin' ? 'an admin' : 'a regular user'}.` }),
      },
    )

  return (
    <tr>
      <td>{person.id}</td>
      <td>{person.name}</td>
      <td>{person.email}</td>
      <td>
        {isMe ? (
          <span className="quiet">You</span>
        ) : (
          <div className={styles.actions}>
            <Button small variant="quiet" disabled={change.isPending} onClick={() => set('admin')} aria-label={`Make ${name} an admin`}>
              Make admin
            </Button>
            <Button small variant="quiet" disabled={change.isPending} onClick={() => set('user')} aria-label={`Make ${name} a regular user`}>
              Make regular user
            </Button>
          </div>
        )}
        {change.isError && (
          <p className={styles.error} role="alert">
            {describeError(change.error)}
          </p>
        )}
      </td>
    </tr>
  )
}
