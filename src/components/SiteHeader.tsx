import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { config } from '../config'
import { ConfirmDialog } from './ConfirmDialog'
import styles from './SiteHeader.module.css'

export function SiteHeader({ wide }: { wide?: boolean }) {
  const { status, user, signOut } = useAuth()
  const location = useLocation()
  const [confirming, setConfirming] = useState(false)

  return (
    <header className={styles.bar}>
      <div className={`page ${styles.header}`} style={wide ? { maxWidth: 'none' } : undefined}>
        <Link to="/" className={styles.name}>
          {config.cinemaName}
        </Link>
        <nav className={styles.nav} aria-label="Account">
          {status === 'signedIn' && user ? (
            <>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={styles.link}>
                  Back office
                </NavLink>
              )}
              <NavLink to="/bookings" className={styles.link}>
                My bookings
              </NavLink>
              <button type="button" className={styles.signOut} onClick={() => setConfirming(true)}>
                Sign out
              </button>
              <ConfirmDialog
                open={confirming}
                title="Sign out?"
                message="You’ll need to sign in again to book seats or see your bookings."
                confirmLabel="Sign out"
                cancelLabel="Stay signed in"
                onConfirm={() => {
                  setConfirming(false)
                  signOut()
                }}
                onCancel={() => setConfirming(false)}
              />
            </>
          ) : (
            status === 'signedOut' && (
              <NavLink to="/signin" state={{ from: location }} className={styles.link}>
                Sign in
              </NavLink>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
