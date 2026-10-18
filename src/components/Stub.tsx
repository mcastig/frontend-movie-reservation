import type { ReactNode } from 'react'
import styles from './Stub.module.css'

interface Props {
  code: string
  // Slides into the tray when picked.
  slide?: boolean
  children?: ReactNode
}

export function Stub({ code, slide, children }: Props) {
  return (
    <span className={`${styles.stub} ${slide ? styles.slide : ''}`}>
      <span className={styles.code}>{code}</span>
      {children}
    </span>
  )
}
