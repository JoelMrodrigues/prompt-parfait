import { useState, useEffect, useCallback } from 'react'
import { fetchTeamMatches } from '../../../services/supabase/matchQueries'

export const useTeamMatches = (teamId: string | null | undefined) => {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMatches = useCallback(async () => {
    if (!teamId) {
      setMatches([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await fetchTeamMatches(teamId)
      if (error) {
        console.warn('useTeamMatches:', error.message)
        setMatches([])
      } else setMatches(data || [])
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    setLoading(true)
    fetchMatches()
  }, [fetchMatches])

  return { matches, loading, refetch: fetchMatches }
}
