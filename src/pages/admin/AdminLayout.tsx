import { NavLink, Outlet } from 'react-router'
import { useDocumentTitle } from '../../lib/lights'
import styles from './admin.module.css'

const tabs = [
  { to: '/admin/movies', label: 'Movies' },
  { to: '/admin/schedule', label: 'Schedule' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/users', label: 'Users' },
]

export function AdminLayout() {
  useDocumentTitle('Back office')
  return (
    <div className={styles.shell}>
      <nav aria-label="Back office">
        <ul className={styles.tabs}>
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} className={styles.tab}>
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
