import { Navigate, createBrowserRouter } from 'react-router'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { LobbyLayout, Root, SkipLink } from './components/Layouts'
import { BookingsPage } from './pages/Bookings'
import { ListingsPage } from './pages/Listings'
import { MoviePage } from './pages/Movie'
import { NotFoundPage } from './pages/NotFound'
import { ShowtimePage } from './pages/Showtime'
import { SignInPage } from './pages/SignIn'
import { SignUpPage } from './pages/SignUp'
import { StyleguidePage } from './pages/Styleguide'
import { AdminBookingsPage } from './pages/admin/AdminBookings'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminMovieFormPage } from './pages/admin/AdminMovieForm'
import { AdminMoviesPage } from './pages/admin/AdminMovies'
import { AdminReportsPage } from './pages/admin/AdminReports'
import { AdminSchedulePage } from './pages/admin/AdminSchedule'
import { AdminUsersPage } from './pages/admin/AdminUsers'

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <LobbyLayout />,
        children: [
          { index: true, element: <ListingsPage /> },
          { path: 'movies/:id', element: <MoviePage /> },
          {
            path: 'bookings',
            element: (
              <RequireAuth>
                <BookingsPage />
              </RequireAuth>
            ),
          },
          { path: 'signin', element: <SignInPage /> },
          { path: 'signup', element: <SignUpPage /> },
          ...(import.meta.env.DEV ? [{ path: 'styleguide', element: <StyleguidePage /> }] : []),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // Lights down: the seat plan gets the whole screen.
      {
        path: 'showtimes/:id',
        element: (
          <>
            <SkipLink />
            <ShowtimePage />
          </>
        ),
      },
      {
        path: 'admin',
        element: <LobbyLayout wide />,
        children: [
          {
            element: (
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            ),
            children: [
              { index: true, element: <Navigate to="/admin/schedule" replace /> },
              { path: 'movies', element: <AdminMoviesPage /> },
              { path: 'movies/new', element: <AdminMovieFormPage /> },
              { path: 'movies/:id', element: <AdminMovieFormPage /> },
              { path: 'schedule', element: <AdminSchedulePage /> },
              { path: 'bookings', element: <AdminBookingsPage /> },
              { path: 'reports', element: <AdminReportsPage /> },
              { path: 'users', element: <AdminUsersPage /> },
            ],
          },
        ],
      },
    ],
  },
])
