/**
 * Snapshots timeline pour une liste de matchs (avantage or/XP à 5,10,15,20,25 min)
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { fetchTimelinesByMatchIds } from '../../../services/supabase/matchQueries'

export const TIMELINE_MINUTES = [5, 10, 15, 20, 25]

export function useTeamTimelines(matchIds: string[] | null | undefined) {
  const [timelines, setTimelines] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const idsKey = matchIds?.length ? matchIds.slice().sort().join(',') : ''

  const fetchTimelines = useCallback(async () => {
    if (!matchIds?.length || !supabase) {
      setTimelines([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await fetchTimelinesByMatchIds(matchIds)
      if (error) {
        console.warn('useTeamTimelines:', error.message)
        setTimelines([])
      } else setTimelines(data || [])
    } catch {
      setTimelines([])
    } finally {
      setLoading(false)
    }
  }, [idsKey])

  useEffect(() => {
    fetchTimelines()
  }, [fetchTimelines])

  return { timelines, loading, refetch: fetchTimelines }
}
