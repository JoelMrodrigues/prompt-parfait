import { useState, useEffect, useCallback } from 'react'
import { fetchTeamMatches } from '../../../services/supabase/matchQueries'

// Cache module-level : données immédiatement disponibles entre navigations (stale-while-revalidate)
const matchCache = new Map<string, any[]>()

export const useTeamMatches = (teamId: string | null | undefined) => {
  const cached = teamId ? matchCache.get(teamId) : undefined
  const [matches, setMatches] = useState<any[]>(cached ?? [])
  // Pas de spinner si on a déjà des données en cache
  const [loading, setLoading] = useState(!cached)

  const fetchMatches = useCallback(async () => {
    if (!teamId) {
      setMatches([])
      setLoading(false)
      return
    }
    // Ne pas afficher le spinner si on a déjà des données (rafraîchissement silencieux)
    if (!matchCache.has(teamId)) setLoading(true)
    try {
      const { data, error } = await fetchTeamMatches(teamId)
      if (error) {
        console.warn('useTeamMatches:', error.message)
        if (!matchCache.has(teamId)) setMatches([])
      } else {
        const fresh = data || []
        matchCache.set(teamId, fresh)
        setMatches(fresh)
      }
    } catch {
      if (!matchCache.has(teamId)) setMatches([])
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const refetch = useCallback(async () => {
    // Refetch forcé : vider le cache pour forcer un rechargement frais
    if (teamId) matchCache.delete(teamId)
    await fetchMatches()
  }, [fetchMatches, teamId])

  return { matches, loading, refetch }
}
