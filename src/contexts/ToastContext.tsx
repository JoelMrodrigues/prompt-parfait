import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
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
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    const t = timersRef.current.get(id)
    if (t !== undefined) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3500) => {
      const id = toastId++
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration) {
        const t = setTimeout(() => {
          timersRef.current.delete(id)
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
        timersRef.current.set(id, t)
      }
      return id
    },
    []
  )

  const success = useCallback((msg: string, dur?: number) => addToast(msg, 'success', dur), [addToast])
  const error = useCallback((msg: string, dur?: number) => addToast(msg, 'error', dur), [addToast])
  const info = useCallback((msg: string, dur?: number) => addToast(msg, 'info', dur), [addToast])

  const value = useMemo(() => ({
    toasts, addToast, removeToast, success, error, info,
  }), [toasts, addToast, removeToast, success, error, info])

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>')
  return ctx
}
