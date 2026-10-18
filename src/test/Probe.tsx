import { useLocation } from 'react-router'

// Shows where the router is, so tests can check navigation.
export function Probe() {
  const location = useLocation()
  return (
    <div hidden data-testid="location" data-state={JSON.stringify(location.state ?? null)}>
      {location.pathname}
      {location.search}
    </div>
  )
}
