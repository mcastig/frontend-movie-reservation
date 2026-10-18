import { Link, NavLink, useLocation } from 'react-router'
import { useAuth } from '../auth/context'
import { config } from '../config'
import styles from './SiteHeader.module.css'

export function SiteHeader({ wide }: { wide?: boolean }) {
  const { status, user, signOut } = useAuth()
  const location = useLocation()

  return (
    <header className="page" style={wide ? { maxWidth: 'none' } : undefined}>
      <div className={styles.header}>
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
              <button type="button" className={styles.signOut} onClick={() => signOut()}>
                Sign out
              </button>
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
