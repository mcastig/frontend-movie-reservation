import { useState } from 'react'
import styles from './PosterFrame.module.css'

interface Props {
  title: string
  posterUrl: string | null
  large?: boolean
}

export function PosterFrame({ title, posterUrl, large }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = posterUrl && failedUrl !== posterUrl

  return (
    <div className={`${styles.frame} ${large ? styles.large : ''}`}>
      {showImage ? (
        <img
          className={styles.image}
          src={posterUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(posterUrl)}
        />
      ) : (
        <span className={styles.missing} aria-hidden="true">
          {title}
        </span>
      )}
    </div>
  )
}
