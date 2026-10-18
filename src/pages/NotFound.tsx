import { ButtonLink } from '../components/Button'
import { PageState } from '../components/PageState'
import { useDocumentTitle } from '../lib/lights'

export function NotFoundPage() {
  useDocumentTitle('Not found')
  return (
    <div className="page">
      <h1 className="page-title" style={{ paddingTop: 'var(--space-6)' }}>
        This page isn’t showing
      </h1>
      <PageState
        kind="empty"
        message="It may have moved, or the showtime was removed."
        action={<ButtonLink to="/">See what’s on today</ButtonLink>}
      />
    </div>
  )
}
