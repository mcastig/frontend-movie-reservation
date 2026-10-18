import type { Location } from 'react-router'

// Router state passed to /signin and /signup, so visitors come back to where they were.
export interface AuthState {
  from?: Pick<Location, 'pathname' | 'search'>
  reason?: 'book'
}

export function returnPath(state: AuthState | null) {
  return state?.from ? `${state.from.pathname}${state.from.search ?? ''}` : '/'
}
