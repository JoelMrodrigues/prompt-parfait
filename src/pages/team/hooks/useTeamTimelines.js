/**
 * Récupère les snapshots timeline pour une liste de match_ids (avantage or/XP à 5,10,15,20,25 min)
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

export const TIMELINE_MINUTES = [5, 10, 15, 20, 25]

export function useTeamTimelines(matchIds) {
  const [timelines, setTimelines] = useState([])
  const [loading, setLoading] = useState(false)

  const idsKey = (matchIds && matchIds.length) ? matchIds.slice().sort().join(',') : ''

  const fetchTimelines = useCallback(async () => {
    if (!matchIds?.length || !supabase) {
      setTimelines([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_match_timeline')
        .select('match_id, snapshot')
        .in('match_id', matchIds)

      if (error) {
        console.warn('useTeamTimelines:', error.message)
        setTimelines([])
      } else {
        setTimelines(data || [])
      }
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
