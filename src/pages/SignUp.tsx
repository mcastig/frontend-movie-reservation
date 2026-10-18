import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError, describeError } from '../api/errors'
import { useAuth } from '../auth/context'
import { returnPath, type AuthState } from '../auth/returnPath'
import { Button } from '../components/Button'
import { TextField } from '../components/Field'
import { Spinner } from '../components/Spinner'
import { useDocumentTitle } from '../lib/lights'
import styles from './Auth.module.css'

export function SignUpPage() {
  useDocumentTitle('Create an account')
  const { status, signUp } = useAuth()
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
      await signUp({
        name: String(form.get('name')).trim(),
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      })
      navigate(returnPath(state), { replace: true })
    } catch (err) {
      setError(err)
      setPending(false)
    }
  }

  const apiError = error instanceof ApiError ? error : null
  const fieldError = (field: string) => {
    if (apiError?.code === 'VALIDATION_ERROR') return apiError.fieldError(field)
    if (apiError?.code === 'EMAIL_TAKEN' && field === 'email') return describeError(apiError)
    return undefined
  }
  const formLevel = error != null && apiError?.code !== 'VALIDATION_ERROR' && apiError?.code !== 'EMAIL_TAKEN'

  return (
    <div className={`page ${styles.wrap}`}>
      <div className={styles.intro}>
        <h1 className="page-title">Create an account</h1>
        <p className={styles.switch}>
          Already have an account?{' '}
          <Link to="/signin" state={state}>
            Sign in
          </Link>
        </p>
        {state?.reason === 'book' && <p className={styles.reason}>You need an account to book seats. Your picks are kept.</p>}
      </div>
      <form className={`panel ${styles.form}`} onSubmit={onSubmit} noValidate>
        <TextField label="Name" name="name" autoComplete="name" required maxLength={100} error={fieldError('name')} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={fieldError('email')}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="At least 8 characters."
          error={fieldError('password')}
        />
        {formLevel && (
          <p className={styles.formError} role="alert">
            {describeError(error)}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              <span className="visually-hidden">Creating your account…</span>
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </div>
  )
}
