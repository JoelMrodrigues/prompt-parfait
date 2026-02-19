import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastType } from '../types'

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => number
  removeToast: (id: number) => void
  success: (msg: string, duration?: number) => number
  error: (msg: string, duration?: number) => number
  info: (msg: string, duration?: number) => number
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3500) => {
      const id = toastId++
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration) setTimeout(() => removeToast(id), duration)
      return id
    },
    [removeToast]
  )

  const success = useCallback((msg: string, dur?: number) => addToast(msg, 'success', dur), [addToast])
  const error = useCallback((msg: string, dur?: number) => addToast(msg, 'error', dur), [addToast])
  const info = useCallback((msg: string, dur?: number) => addToast(msg, 'info', dur), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>')
  return ctx
}
