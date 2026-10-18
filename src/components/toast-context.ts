import { createContext, useContext } from 'react'

export interface ToastInput {
  message: string
  tone?: 'info' | 'error'
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast needs <ToastProvider>')
  return show
}
