/**
 * Mini-store for auto-sync status — no context needed.
 * useTeamAutoSync writes via setSyncStatus(); TeamSidebar reads via useSyncStatus().
 */
import { useState, useEffect } from 'react'

export interface SyncStatus {
  isSyncing: boolean
  currentPlayer: string
  lastCycleAt: number | null  // timestamp de fin du dernier cycle complet
}

let state: SyncStatus = { isSyncing: false, currentPlayer: '', lastCycleAt: null }
const listeners = new Set<() => void>()

export function setSyncStatus(patch: Partial<SyncStatus>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  const [s, setS] = useState<SyncStatus>(() => state)
  useEffect(() => {
    const update = () => setS({ ...state })
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])
  return s
}
