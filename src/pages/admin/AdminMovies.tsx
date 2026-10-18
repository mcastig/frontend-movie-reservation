import { useState } from 'react'
import { Link } from 'react-router'
import { describeError } from '../../api/errors'
import { useDeleteMovie, useMovies } from '../../api/hooks'
import type { Movie } from '../../api/types'
import { ButtonLink } from '../../components/Button'
import { PageState } from '../../components/PageState'
import { useToast } from '../../components/toast-context'
import { formatDuration } from '../../lib/time'
import styles from './admin.module.css'

export function AdminMoviesPage() {
  const movies = useMovies()

  return (
    <section className={styles.section} aria-labelledby="movies-title">
      <div className={styles.titleRow}>
        <h1 id="movies-title" className={styles.title}>
          Movies
        </h1>
        <ButtonLink to="/admin/movies/new" small>
          Add a movie
        </ButtonLink>
      </div>
      {movies.isPending ? (
        <PageState kind="loading" />
      ) : movies.isError ? (
        <PageState kind="error" error={movies.error} onRetry={() => movies.refetch()} />
      ) : movies.data.data.length === 0 ? (
        <PageState kind="empty" message="No movies yet. Add the first one to start scheduling." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Length</th>
                <th scope="col">Genres</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {movies.data.data.map((movie) => (
                <MovieRow key={movie.id} movie={movie} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function MovieRow({ movie }: { movie: Movie }) {
  const [confirming, setConfirming] = useState(false)
  const remove = useDeleteMovie()
  const toast = useToast()

  return (
    <tr>
      <td>
        <Link to={`/admin/movies/${movie.id}`}>{movie.title}</Link>
      </td>
      <td>{formatDuration(movie.durationMinutes)}</td>
      <td>{movie.genres.map((g) => g.name).join(', ') || '—'}</td>
      <td>
        <div className={styles.actions}>
          <Link to={`/admin/movies/${movie.id}`}>Edit</Link>
          {confirming ? (
            <>
              <button
                type="button"
                className={`${styles.linkButton} ${styles.danger}`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(movie.id, {
                    onSuccess: () => toast({ message: `${movie.title} deleted.` }),
                    onSettled: () => setConfirming(false),
                  })
                }
              >
                Yes, delete {movie.title}
              </button>
              <button type="button" className={styles.linkButton} onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${styles.linkButton} ${styles.danger}`}
              onClick={() => {
                remove.reset()
                setConfirming(true)
              }}
            >
              Delete
            </button>
          )}
        </div>
        {remove.isError && (
          <p className={styles.error} role="alert">
            {describeError(remove.error)}
          </p>
        )}
      </td>
    </tr>
  )
}
