import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, describeError } from '../../api/errors'
import { useCreateGenre, useCreateMovie, useGenres, useMovie, useUpdateMovie } from '../../api/hooks'
import type { Movie, MoviePatch } from '../../api/types'
import { Button } from '../../components/Button'
import { Field, TextField } from '../../components/Field'
import { PageState } from '../../components/PageState'
import { useToast } from '../../components/toast-context'
import styles from './admin.module.css'

export function AdminMovieFormPage() {
  const { id } = useParams()
  const movieId = id === undefined ? undefined : Number(id)
  const movie = useMovie(movieId ?? 0, movieId !== undefined)

  if (movieId === undefined) return <MovieForm />
  if (movie.isPending) return <PageState kind="loading" />
  if (movie.isError) return <PageState kind="error" error={movie.error} onRetry={() => movie.refetch()} />
  return <MovieForm key={movie.data.id} movie={movie.data} />
}

function MovieForm({ movie }: { movie?: Movie }) {
  const navigate = useNavigate()
  const toast = useToast()
  const genres = useGenres()
  const create = useCreateMovie()
  const update = useUpdateMovie()
  const createGenre = useCreateGenre()
  const [genreIds, setGenreIds] = useState<number[]>(movie?.genres.map((g) => g.id) ?? [])
  const [newGenre, setNewGenre] = useState('')
  const [error, setError] = useState<unknown>(null)
  const saving = create.isPending || update.isPending

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const posterUrl = String(form.get('posterUrl')).trim()
    const values = {
      title: String(form.get('title')).trim(),
      description: String(form.get('description')).trim(),
      posterUrl: posterUrl || null,
      durationMinutes: Number(form.get('durationMinutes')),
      genreIds,
    }
    setError(null)
    const done = (saved: Movie) => {
      toast({ message: `${saved.title} saved.` })
      navigate('/admin/movies')
    }

    if (!movie) {
      create.mutate(values, { onSuccess: done, onError: setError })
      return
    }
    // PATCH is partial: send only what changed.
    const body: MoviePatch = {}
    if (values.title !== movie.title) body.title = values.title
    if (values.description !== movie.description) body.description = values.description
    if (values.posterUrl !== movie.posterUrl) body.posterUrl = values.posterUrl
    if (values.durationMinutes !== movie.durationMinutes) body.durationMinutes = values.durationMinutes
    const before = movie.genres.map((g) => g.id).sort()
    if (before.join() !== [...genreIds].sort().join()) body.genreIds = genreIds
    if (Object.keys(body).length === 0) {
      navigate('/admin/movies')
      return
    }
    update.mutate({ id: movie.id, body }, { onSuccess: done, onError: setError })
  }

  const addGenre = () => {
    const name = newGenre.trim()
    if (!name) return
    createGenre.mutate(name, {
      onSuccess: (genre) => {
        setGenreIds((ids) => [...ids, genre.id])
        setNewGenre('')
      },
    })
  }

  const apiError = error instanceof ApiError ? error : null
  const fieldError = (field: string) => (apiError?.code === 'VALIDATION_ERROR' ? apiError.fieldError(field) : undefined)

  return (
    <section className={styles.section} aria-labelledby="movie-form-title">
      <p>
        <Link to="/admin/movies">← Movies</Link>
      </p>
      <h1 id="movie-form-title" className={styles.title}>
        {movie ? `Edit ${movie.title}` : 'Add a movie'}
      </h1>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField label="Title" name="title" defaultValue={movie?.title} required maxLength={200} error={fieldError('title')} />
        <Field label="Description" error={fieldError('description')}>
          {(control) => (
            <textarea name="description" defaultValue={movie?.description} required maxLength={5000} {...control} />
          )}
        </Field>
        <TextField
          label="Length in minutes"
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          defaultValue={movie?.durationMinutes}
          required
          error={fieldError('durationMinutes')}
        />
        <TextField
          label="Poster URL"
          name="posterUrl"
          type="url"
          defaultValue={movie?.posterUrl ?? ''}
          hint="Optional. Without one, the title is shown in the poster’s place."
          error={fieldError('posterUrl')}
        />

        <fieldset className={styles.checks}>
          <legend>Genres</legend>
          {genres.data?.map((genre) => (
            <label key={genre.id} className={styles.check}>
              <input
                type="checkbox"
                checked={genreIds.includes(genre.id)}
                onChange={(e) =>
                  setGenreIds((ids) => (e.target.checked ? [...ids, genre.id] : ids.filter((g) => g !== genre.id)))
                }
              />
              {genre.name}
            </label>
          ))}
        </fieldset>
        <div className={styles.inline}>
          <TextField
            label="New genre"
            value={newGenre}
            maxLength={50}
            onChange={(e) => setNewGenre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addGenre()
              }
            }}
            error={createGenre.isError ? describeError(createGenre.error) : undefined}
          />
          <Button variant="quiet" onClick={addGenre} disabled={createGenre.isPending || !newGenre.trim()}>
            Add genre
          </Button>
        </div>
        {fieldError('genreIds') && <p className={styles.error}>{fieldError('genreIds')}</p>}

        {error != null && apiError?.code !== 'VALIDATION_ERROR' && (
          <p className={styles.error} role="alert">
            {describeError(error)}
          </p>
        )}
        <div className={styles.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : movie ? 'Save changes' : 'Add movie'}
          </Button>
        </div>
      </form>
    </section>
  )
}
