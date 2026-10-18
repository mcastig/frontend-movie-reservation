import type { ComponentProps } from 'react'
import { Link, type LinkProps } from 'react-router'
import styles from './Button.module.css'

type Variant = 'primary' | 'quiet' | 'danger' | 'book'

interface Common {
  variant?: Variant
  small?: boolean
}

const classes = ({ variant = 'primary', small }: Common, extra?: string) =>
  [styles.button, styles[variant], small && styles.small, extra].filter(Boolean).join(' ')

export function Button({
  variant,
  small,
  className,
  type = 'button',
  ...props
}: Common & ComponentProps<'button'>) {
  return <button type={type} className={classes({ variant, small }, className)} {...props} />
}

export function ButtonLink({ variant, small, className, ...props }: Common & LinkProps) {
  return <Link className={classes({ variant, small }, className)} {...props} />
}
