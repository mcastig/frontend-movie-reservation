import { Outlet, ScrollRestoration } from 'react-router'
import { SiteHeader } from './SiteHeader'

export function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to content
    </a>
  )
}

export function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

// Lights up: the lobby pages, under the site header.
export function LobbyLayout({ wide }: { wide?: boolean }) {
  return (
    <>
      <SkipLink />
      <SiteHeader wide={wide} />
      <main id="main">
        <Outlet />
      </main>
    </>
  )
}
