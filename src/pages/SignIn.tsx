import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError, describeError } from '../api/errors'
import { useAuth } from '../auth/context'
import { returnPath, type AuthState } from '../auth/returnPath'
import { Button } from '../components/Button'
import { TextField } from '../components/Field'
import { useDocumentTitle } from '../lib/lights'
import styles from './Auth.module.css'

export function SignInPage() {
  useDocumentTitle('Sign in')
  const { status, signIn } = useAuth()
  const navigate = useNavigate()
  const state = useLocation().state as AuthState | null
  const [error, setError] = useState<unknown>(null)
  const [pending, setPending] = useState(false)

  if (status === 'signedIn' && !pending) return <Navigate to={returnPath(state)} replace />

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await signIn(String(form.get('email')), String(form.get('password')))
      navigate(returnPath(state), { replace: true })
    } catch (err) {
      setError(err)
      setPending(false)
    }
  }

  const apiError = error instanceof ApiError ? error : null
  const fieldErrors = apiError?.code === 'VALIDATION_ERROR'

  return (
    <div className={`page ${styles.wrap}`}>
      <div className={styles.intro}>
        <h1 className="page-title">Sign in</h1>
        <p className={styles.switch}>
          New here?{' '}
          <Link to="/signup" state={state}>
            Create an account
          </Link>
        </p>
        {state?.reason === 'book' && (
          <p className={styles.reason}>Sign in to book your seats. They’ll still be picked when you’re back.</p>
        )}
      </div>
      <form className={`panel ${styles.form}`} onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fieldErrors ? apiError.fieldError('email') : undefined}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={fieldErrors ? apiError.fieldError('password') : undefined}
        />
        {error != null && !fieldErrors && (
          <p className={styles.formError} role="alert">
            {describeError(error)}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
