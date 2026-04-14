import { useState, useCallback, useEffect } from 'react'
import type { CanvasData, ToolMode } from './types'
import { DEFAULT_CANVAS_DATA } from './constants'

const MAX_HISTORY = 50

export function usePlanCanvas(initialData?: CanvasData) {
  const [past, setPast]       = useState<CanvasData[]>([])
  const [present, setPresent] = useState<CanvasData>(initialData ?? DEFAULT_CANVAS_DATA)
  const [future, setFuture]   = useState<CanvasData[]>([])
  const [tool, setTool]       = useState<ToolMode>('select')
  const [drawColor, setDrawColor] = useState('#ffffff')
  const [strokeWidth, setStrokeWidth] = useState(2)

  // ─── Keyboard shortcuts undo/redo ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [past, present, future])

  // ─── History ops ─────────────────────────────────────────────────────────
  const commit = useCallback((newData: CanvasData) => {
    setPast((p) => [...p.slice(-MAX_HISTORY + 1), present])
    setPresent(newData)
    setFuture([])
  }, [present])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const prev = p[p.length - 1]
      setFuture((f) => [present, ...f])
      setPresent(prev)
      return p.slice(0, -1)
    })
  }, [present])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setPast((p) => [...p, present])
      setPresent(next)
      return f.slice(1)
    })
  }, [present])

  const resetToData = useCallback((newData: CanvasData) => {
    setPast([])
    setPresent(newData)
    setFuture([])
  }, [])

  return {
    data: present,
    commit,
    undo,
    redo,
    resetToData,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    tool, setTool,
    drawColor, setDrawColor,
    strokeWidth, setStrokeWidth,
  }
}
