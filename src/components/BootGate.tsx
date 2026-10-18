import { useEffect, useState, type ReactNode } from 'react'
import { config } from '../config'
import { PageState } from './PageState'

type Status = 'checking' | 'waking' | 'ready'

// The free API plan sleeps after 15 minutes idle and can take a minute to wake.
// Say so instead of showing a blank page.
export function BootGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    const timer = setTimeout(() => setStatus('waking'), config.wakeUpNoticeMs)

    const check = async (): Promise<void> => {
      try {
        const response = await fetch(`${config.apiUrl}/health`)
        if (response.ok) return
      } catch {
        // Still asleep, or offline; try again shortly.
      }
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return check()
    }

    check().then(() => {
      clearTimeout(timer)
      setStatus('ready')
    })
    return () => clearTimeout(timer)
  }, [])

  if (status === 'ready') return children
  if (status === 'checking') return null
  return (
    <main className="page">
      <PageState kind="loading" message="Opening the box office…" />
    </main>
  )
}
